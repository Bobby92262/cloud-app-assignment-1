import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { PutCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { actorKey, ddb, movieKey, type Role, tableName } from "../shared/db";
import { isResponse, parseJsonObject, response } from "../shared/http";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const body = parseJsonObject(event); // This method will parse the JSON body from the HTTP
  if (isResponse(body)) return body;

  /* 
  Blind assertion of good incoming data, only type checked! 
  So need some form of validation.
   
  Is as sufficient ? as checks compile time but not runtime !
  */
 
  const role: Role = {
    movieId: body.movieId as number,
    actorId: body.actorId as number,
    roleName: body.roleName as string,
    roleDescription: body.roleDescription as string,
  };

  try {
    //  TOD∏O - Add role if its IDs are valid
    await ddb.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          PK: movieKey(role.movieId),
          SK: actorKey(role.actorId),
          ...role
        },
      })
    );
    return response(201, { message: "Role added", data: role });
  } catch (err) {
    console.error("DynamoDB error:", err);
    return response(500, {
      message: "Internal server error",
      error: err,
    });
  }
};
