import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import indiaTopoJson from '../assets/data/india-states.json'

// T-21 (US-50/KAN-61), PR 1 of 3: proves the circle->state mapping and the
// map itself render correctly, with no shading/interactivity yet -- those
// are PR 2 (choropleth) and PR 3 (click-to-filter). Deliberately a single
// neutral fill here so a boundary/rendering mistake is easy to spot on
// its own, not hidden under a shading gradient.
//
// TopoJSON source: geoBoundaries India ADM1 (36 regions, CC BY 2.5 India
// license -- see docs/PRD-Addendum-App-Catalogue-UX.md's T-21 row),
// simplified via mapshaper to ~60KB. Imported as a plain JSON module (the
// file is named .json, not .topojson, specifically so Vite parses it at
// build time) rather than fetched at runtime -- simpler and avoids any
// packaged-app fetch/asset-path risk. Region-name resolution to postal
// circles lives in ../lib/postalCircleStates.ts, not here -- this
// component only renders shapes, it doesn't know about circles or covers.
export default function IndiaMap(): React.JSX.Element {
  return (
    <ComposableMap
      projection="geoMercator"
      projectionConfig={{ center: [83, 23], scale: 1000 }}
      role="img"
      aria-label="Map of India by state, for browsing the catalogue by region"
      className="w-full h-auto"
    >
      <Geographies geography={indiaTopoJson}>
        {({ geographies }) =>
          geographies.map((geo) => (
            <Geography
              key={geo.rsmKey}
              geography={geo}
              data-testid={`india-map-region-${geo.properties.shapeName}`}
              style={{
                default: {
                  fill: 'var(--color-line)',
                  stroke: 'var(--color-line-strong)',
                  strokeWidth: 0.5,
                  outline: 'none'
                },
                hover: {
                  fill: 'var(--color-line-strong)',
                  stroke: 'var(--color-line-strong)',
                  strokeWidth: 0.5,
                  outline: 'none'
                },
                pressed: {
                  fill: 'var(--color-line-strong)',
                  stroke: 'var(--color-line-strong)',
                  strokeWidth: 0.5,
                  outline: 'none'
                }
              }}
            />
          ))
        }
      </Geographies>
    </ComposableMap>
  )
}
