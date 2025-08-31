import { GraphQLClient } from "graphql-request";

export const graphqlClient = new GraphQLClient(
  "https://admin.operator-radio.com/api/graphql"
  //"https://indexer.dev.hyperindex.xyz/945d926/v1/graphql"
  // "https://indexer.dev.hyperindex.xyz/6450c10/v1/graphql"
);

export interface SiloApproval {
  id: string;
  owner: string;
  spender: string;
  value: string; // Consider BigInt if it's a large number
  db_write_timestamp: string; // Or Date if converting
}

export interface GetSiloApprovalResponse {
  Silo_Approval: SiloApproval[];
}

export interface GetSiloDelegateChanged{
  delegator: string;
	fromDelegate: string;
	id: string;
	toDelegate: string;
	db_write_timestamp: string;
}

export interface SiloDelegateChanged{
Silo_DelegateChanged: SiloDelegateChanged[];
}

export interface RawEvent {
  block_timestamp: number;
  event_name: string;
  data: string;
}

export interface GetTransferResponse {
  raw_events: RawEvent[];
}

export interface GetSiloDelegateVotesChanged{
  Silo_DelegateVotesChanged: SiloDelegateVotesChanged[];
}
export interface SiloDelegateVotesChanged{
    newBalance:string;
		previousBalance: string;
		delegate: string;
		id: string;
		db_write_timestamp: string;
}

export interface GetSiloOwnershipTransferred{
  Silo_OwnershipTransferred: SiloOwnershipTransferred[];
}
export interface SiloOwnershipTransferred{
    id: string;
		newOwner: string;
		previousOwner: string;
		db_write_timestamp: string;
}

export interface RawEventsAggregate {
  raw_events_aggregate: {
    aggregate: {
      count: number;
    };
  };
}

export interface GetEventStatsResponse {
  current_period: {
    aggregate: {
      count: number;
    };
  };
  previous_period: {
    aggregate: {
      count: number;
    };
  };
}