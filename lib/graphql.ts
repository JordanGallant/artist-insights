// lib/graphql.ts
import { GraphQLClient } from 'graphql-request'

// Use your own API route instead of the external endpoint
export const graphqlClient = new GraphQLClient('/api/graphql')