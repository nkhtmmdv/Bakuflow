import { createClient } from "@/lib/supabase/server";
import { searchTrips, logTripRequest } from "@/lib/trip/search";
import { TripCard, type TripCardData } from "@/components/features/TripCard";
import { T } from "@/components/i18n/T";

export default async function TripPage({ searchParams }: PageProps<"/trip">) {
  const params = await searchParams;
  const originNodeId = typeof params.origin === "string" ? params.origin : undefined;
  const destinationNodeId = typeof params.destination === "string" ? params.destination : undefined;
  const arrivalRaw = typeof params.arrival === "string" ? params.arrival : undefined;
  const anonymousSessionId = typeof params.sid === "string" ? params.sid : undefined;

  if (!originNodeId || !destinationNodeId) {
    return (
      <div className="px-4 py-10 text-center text-sm text-zinc-500">
        <T k="trip.empty" />
      </div>
    );
  }

  const desiredArrival = arrivalRaw ? new Date(arrivalRaw) : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [trips] = await Promise.all([
    searchTrips({ originNodeId, destinationNodeId, desiredArrival }),
    logTripRequest({ originNodeId, destinationNodeId, desiredArrival, anonymousSessionId }),
  ]);

  const tripCards: TripCardData[] = trips.map((trip) => ({
    label: trip.label,
    recommended: trip.recommended,
    legs: trip.legs.map((leg) => ({
      fromNode: leg.fromNode,
      toNode: leg.toNode,
      routeType: leg.routeType,
      minutes: leg.minutes,
    })),
    estimatedMinutesRange: trip.estimatedMinutesRange,
    transfers: trip.transfers,
    walkingMinutes: trip.walkingMinutes,
    suggestedDeparture: trip.suggestedDeparture ? trip.suggestedDeparture.toISOString() : null,
    worstCrowdLevel: trip.worstCrowdLevel,
  }));

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <h1 className="text-xl font-bold">
        <T k="trip.title" />
      </h1>

      {tripCards.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-500">
          <T k="trip.empty" />
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {tripCards.map((trip, index) => (
            <TripCard key={`${trip.label}-${index}`} trip={trip} isAuthenticated={!!user} />
          ))}
        </div>
      )}
    </div>
  );
}
