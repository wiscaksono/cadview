---
title: Events
---

# Events

<p class="subtitle">// listen for selection, measurement, and view changes</p>

The `CadViewer` uses a typed event emitter. Subscribe with `on()` and unsubscribe with `off()`.

```typescript
const handler = (event: SelectEvent) => {
  console.log('Selected:', event.entity.type);
};

viewer.on('select', handler);
viewer.off('select', handler);
```

## Event Map

| Event | Payload | Fired When |
|-------|---------|------------|
| `select` | `SelectEvent` | User clicks an entity with the select tool |
| `measure` | `MeasureEvent` | User completes a two-point measurement |
| `viewchange` | `ViewTransform` | Camera position or zoom changes |

## SelectEvent

Fired when the user clicks on an entity using the `select` tool.

```typescript
interface SelectEvent {
  entity: DxfEntity;       // The selected entity
  entityIndex: number;     // Index in the entities array
  worldPoint: Point2D;     // Click position in world coordinates
  screenPoint: Point2D;    // Click position in screen pixels
}
```

### Example

```typescript
viewer.on('select', (event) => {
  const { entity, worldPoint } = event;

  console.log(`Type: ${entity.type}`);
  console.log(`Layer: ${entity.layer}`);
  console.log(`Position: (${worldPoint.x.toFixed(2)}, ${worldPoint.y.toFixed(2)})`);

  // Access type-specific properties
  if (entity.type === 'CIRCLE') {
    console.log(`Radius: ${entity.radius}`);
  }
});
```

## MeasureEvent

Fired when the user completes a two-point measurement using the `measure` tool.

```typescript
interface MeasureEvent {
  distance: number;            // Euclidean distance in drawing units
  angle: number;               // Angle in degrees (0-360)
  deltaX: number;              // Horizontal distance
  deltaY: number;              // Vertical distance
  points: [Point2D, Point2D];  // The two measured points
}
```

### Snap System

The measure tool automatically snaps to nearby geometry:

- **Endpoints** &mdash; Start and end points of lines, polylines, arcs
- **Midpoints** &mdash; Center of line segments
- **Centers** &mdash; Center of circles, arcs, and ellipses

Snap tolerance is 5 pixels in screen space. A visual indicator shows the snap type:
- **Square** marker for endpoints
- **Triangle** marker for midpoints
- **Circle** marker for centers

### Example

```typescript
viewer.on('measure', (event) => {
  const { distance, angle, deltaX, deltaY } = event;

  console.log(`Distance: ${distance.toFixed(4)} units`);
  console.log(`Angle: ${angle.toFixed(1)}°`);
  console.log(`Delta: (${deltaX.toFixed(4)}, ${deltaY.toFixed(4)})`);
});
```

## ViewTransform

Fired whenever the camera position or zoom level changes (pan, zoom, or `fitToView()`).

```typescript
interface ViewTransform {
  scale: number;     // Current zoom scale
  offsetX: number;   // Horizontal offset in pixels
  offsetY: number;   // Vertical offset in pixels
}
```

### Example

```typescript
viewer.on('viewchange', (transform) => {
  console.log(`Zoom: ${(transform.scale * 100).toFixed(0)}%`);
});
```

## Framework Wrappers

In framework wrappers, events are exposed as callback props:

### React

```tsx
<CadViewer
  file={file}
  onSelect={(event) => console.log(event.entity)}
  onMeasure={(event) => console.log(event.distance)}
  onViewChange={(transform) => console.log(transform.scale)}
/>
```

### Svelte

```svelte
<CadViewer
  {file}
  onselect={(event) => console.log(event.entity)}
  onmeasure={(event) => console.log(event.distance)}
  onviewchange={(transform) => console.log(transform.scale)}
/>
```

### Vue

```vue
<CadViewer
  :file="file"
  @select="(event) => console.log(event.entity)"
  @measure="(event) => console.log(event.distance)"
  @viewchange="(transform) => console.log(transform.scale)"
/>
```
