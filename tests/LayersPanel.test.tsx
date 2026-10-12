import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect } from 'vitest';
import LayersPanel from '../src/presentation/components/map/LayersPanel';
import { emptyAirspace } from '../src/infrastructure/adapters/geojson';
import { useExplorer } from '../src/app/store/use-explorer';
describe('Layer controls', () => {
  it('disables unavailable official layers while allowing radius and airport changes', () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    client.setQueryData(['airspace'], emptyAirspace());
    render(
      <QueryClientProvider client={client}>
        <LayersPanel onClose={() => {}} />
      </QueryClientProvider>,
    );
    expect(screen.getByLabelText(/Verified prohibited/)).toBeDisabled();
    expect(screen.getAllByText('No active verified data loaded')).toHaveLength(
      4,
    );
    const airports = screen.getByLabelText('Airports');
    fireEvent.click(airports);
    expect(useExplorer.getState().layers.airports).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: '10 km' }));
    expect(useExplorer.getState().radius).toBe(10);
    expect(screen.getByText(/not legal no-fly boundaries/)).toBeInTheDocument();
    useExplorer.getState().setLayer('airports', true);
    useExplorer.getState().setRadius(5);
  });
});
