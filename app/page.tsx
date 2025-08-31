"use client";
import EventGraph from "@/components/EventGraph";
import { EventType } from "./types";
import { graphqlClient } from "../lib/graphql";
import React, { useEffect, useState } from "react";


interface DistinctEvents {
  event_name: string;
  contract_name: string;
}


interface DistinctEventsResponse {
  raw_events: DistinctEvents[];
}


export default function Home() {

  const [eventTypes, setEventTypes] = useState<EventType[]>([]);

  useEffect(() => {
    const fetchData = async () => {

      const eventQuery = `
      query {
  Artists {
    docs {
      id
      artistName
      slug
      artistResident
      intro
      biography
      tagline
      dateCreated
      instagram
      soundcloud
      twitter
      youtube
      facebook
      mixcloud
      website
      updatedAt
      createdAt
      _status
    }
  }
}
    `;

      const eventTypesResponse: DistinctEventsResponse = await graphqlClient.request(eventQuery);

      const eventTypesMapped: EventType[] = eventTypesResponse.raw_events.map((event) => {
        return { id: event.contract_name + event.event_name, eventName: event.event_name, label: `${event.contract_name} - ${event.event_name}`, contractType: event.contract_name }
      })

      setEventTypes(eventTypesMapped);

    }

    fetchData();
  }, []);



  return (
    <div>
      <EventGraph eventTypes={eventTypes} />
    </div>
  );
}
