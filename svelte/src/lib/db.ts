import { GraphQLClient } from 'graphql-request';
import { type GqlRequest, objHas } from '../internal';

export class DB {
  private static client: GraphQLClient;
  private static failedQueue: GqlRequest[];
  private static retryDelay = 1; // in seconds
  private static maxDelay: number = Math.pow(1.5, 8); // ~25 seconds
  public static online = false;

  configure(graphqlUrl: string, graphqlAuthToken: string): void {
    DB.failedQueue = [];
    DB.client = new GraphQLClient([graphqlUrl, 'graphql'].join('/'), {
      headers: {
        authorization: ['Bearer', graphqlAuthToken].join(' '),
      },
    });
  }

  public static getClient(): GraphQLClient {
    return DB.client;
  }

  public static appedToQueue(gqlReq: GqlRequest): void {
    DB.failedQueue.push(gqlReq);
  }

  public static async processQueue(): Promise<void> {
    try {
      while (DB.failedQueue.length > 0) {
        const qVar: GqlRequest = DB.failedQueue[0];
        await DB.getClient().request(qVar.q, qVar.variables);
        DB.failedQueue.shift();
      }

      DB.online = true;
      DB.retryDelay = 1;
    } catch {
      DB.online = false;
      DB.retryDelay = Math.min(DB.maxDelay, DB.retryDelay * 1.5);
      window.setTimeout((): void => {
        void DB.processQueue();
      }, DB.retryDelay * 1000);
    }
  }
}

interface DbError extends Error {
  response?: { data: object; errors: object };
}

export async function db<T>(
  q: string,
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  variables: Record<string, any>,
  queueable: boolean = false
): Promise<T> {
  try {
    if (!DB.online) await DB.processQueue();
    const res: T = await DB.getClient().request(q, variables);
    DB.online ||= true;
    return res;
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'Network request failed') {
        DB.online = false;

        if (queueable) {
          DB.appedToQueue({ q: q, variables: variables });
          await DB.processQueue();
        }

        throw e;
      } else if (objHas(e, 'response')) {
        console.log('graphql errors:', (e as DbError).response!.errors);
        return (e as DbError).response!.data as T;
      }
    } else {
      console.log(e);
    }
  }

  return {} as T; // eslint hack
}
