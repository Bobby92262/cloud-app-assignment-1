import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import {
  actorKey,
  ddb,
  parseId,
  tableName,
  toActor,
} from "../shared/db";
import { response } from "../shared/http";
import { logRequest } from "../shared/request-logger";
import { isRoleItem, movieKey, toRole } from "../shared/model"

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  logRequest(event);

  const actorId = parseId(event.pathParameters?.actorID);
  if (actorId === undefined) {
    return response(400, { message: "actorID must be a positive integer" });
  }

  const movieParam = event.queryStringParameters?.movie;
  const movieId = parseId(movieParam);
  if (movieParam !== undefined && movieId === undefined) {
    return response(400, { message: "movie must be a positive integer" });
  }
  
  try {
    const actorResult = await ddb.send(
      new GetCommand({
        TableName: tableName,
        Key: { PK: actorKey(actorId), SK: actorKey(actorId) },
      })
    );


    if (!actorResult.Item) {
      return response(404, { message: `Actor ${actorId} not found` });
    }

    const actorData = toActor(actorResult.Item)

    if (!movieId) {
      return response(200, {data: actorData})
    }

    const roleResult = await ddb.send(
      new GetCommand({
        TableName: tableName,
        Key: {PK: movieKey(movieId), SK: actorKey(actorId) },
      }),
    );

    let responsePayload: Record<string, unknown> = {...actorData};
    if (roleResult.Item && isRoleItem(roleResult.Item)){
      responsePayload.role = toRole(roleResult.Item);
    }

    return response(200, { data: responsePayload });
  } catch (err) {
    console.error("DynamoDB error:", err);
    return response(500, { message: "Internal server error", error: err });
  }
};
