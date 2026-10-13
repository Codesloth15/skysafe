import type { GeographicLocation } from '../../../domain/entities';
import { useExplorer } from '../../../app/store/use-explorer';

export default function LocationFocusButton({
  location,
  name,
  onFocus,
}: {
  location: GeographicLocation;
  name: string;
  onFocus?: () => void;
}) {
  const select = useExplorer((state) => state.select);
  return (
    <button
      type="button"
      className="location-focus"
      title="Zoom to this location on the map"
      onClick={() => {
        select(location, name, true, 15);
        onFocus?.();
      }}
    >
      {name}
    </button>
  );
}
