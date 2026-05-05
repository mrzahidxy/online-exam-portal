export type CircuitComponentType = 'battery' | 'switch' | 'bulb';

export type CircuitComponent = {
  id: string;
  type: CircuitComponentType;
  x: number;
  y: number;
};

export type CircuitTemplate = {
  version: 1;
  width: number;
  height: number;
  components: CircuitComponent[];
};

export type CircuitTemplateLike =
  | CircuitTemplate
  | {
      version?: 1;
      width?: number;
      height?: number;
      components?: CircuitComponent[];
      battery?: { x?: number; y?: number };
      switch?: { x?: number; y?: number };
      bulb?: { x?: number; y?: number };
    }
  | null
  | undefined;

const defaultComponents = (): CircuitComponent[] => [
  { id: 'battery-1', type: 'battery', x: 48, y: 70 },
  { id: 'switch-1', type: 'switch', x: 252, y: 110 },
  { id: 'bulb-1', type: 'bulb', x: 576, y: 90 },
];

export const createDefaultCircuitTemplate = (): CircuitTemplate => ({
  version: 1,
  width: 720,
  height: 320,
  components: defaultComponents(),
});

const isComponentType = (value: unknown): value is CircuitComponentType =>
  value === 'battery' || value === 'switch' || value === 'bulb';

export const normalizeCircuitTemplate = (
  template?: CircuitTemplateLike
): CircuitTemplate => {
  if (!template) {
    return createDefaultCircuitTemplate();
  }

  const width = Number.isFinite(template.width) ? Number(template.width) : 720;
  const height = Number.isFinite(template.height) ? Number(template.height) : 320;

  if (Array.isArray(template.components)) {
    const components = template.components
      .filter(
        (component): component is CircuitComponent =>
          !!component &&
          typeof component.id === 'string' &&
          isComponentType(component.type) &&
          Number.isFinite(component.x) &&
          Number.isFinite(component.y)
      )
      .map((component, index) => ({
        id: component.id || `${component.type}-${index + 1}`,
        type: component.type,
        x: Number(component.x),
        y: Number(component.y),
      }));

    return {
      version: 1,
      width,
      height,
      components,
    };
  }

  const legacyComponents = defaultComponents();

  if (
    template.battery &&
    template.switch &&
    template.bulb &&
    Number.isFinite(template.battery.x) &&
    Number.isFinite(template.battery.y) &&
    Number.isFinite(template.switch.x) &&
    Number.isFinite(template.switch.y) &&
    Number.isFinite(template.bulb.x) &&
    Number.isFinite(template.bulb.y)
  ) {
    legacyComponents[0] = {
      id: 'battery-1',
      type: 'battery',
      x: Number(template.battery.x),
      y: Number(template.battery.y),
    };
    legacyComponents[1] = {
      id: 'switch-1',
      type: 'switch',
      x: Number(template.switch.x),
      y: Number(template.switch.y),
    };
    legacyComponents[2] = {
      id: 'bulb-1',
      type: 'bulb',
      x: Number(template.bulb.x),
      y: Number(template.bulb.y),
    };
  }

  return {
    version: 1,
    width,
    height,
    components: legacyComponents,
  };
};

const componentOrder: CircuitComponentType[] = ['battery', 'switch', 'bulb'];

export const createCircuitComponent = (
  type: CircuitComponentType,
  index: number,
  x: number,
  y: number
): CircuitComponent => ({
  id: `${type}-${index + 1}`,
  type,
  x,
  y,
});

export const generateCircuitComponentId = (
  template: CircuitTemplate,
  type: CircuitComponentType
) => {
  const maxIndex = template.components.reduce((max, component) => {
    if (component.type !== type) return max;
    const match = component.id.match(new RegExp(`^${type}-(\\d+)$`));
    const nextIndex = match ? Number(match[1]) : 0;
    return Number.isFinite(nextIndex) ? Math.max(max, nextIndex) : max;
  }, 0);

  return `${type}-${maxIndex + 1}`;
};

export const defaultComponentPosition = (
  type: CircuitComponentType,
  index: number
) => {
  const row = Math.floor(index / 3);
  const col = index % 3;
  const baseX = 56 + col * 180;
  const baseY = 64 + row * 126;

  switch (type) {
    case 'battery':
      return { x: baseX, y: baseY };
    case 'switch':
      return { x: baseX + 12, y: baseY + 14 };
    case 'bulb':
      return { x: baseX + 88, y: baseY + 62 };
  }
};

export const terminalSuffixes: Record<CircuitComponentType, Array<[string, string, number, number]>> = {
  battery: [
    ['positive', '+', 120, 46],
    ['negative', '-', 120, 134],
  ],
  switch: [
    ['left', 'L', 30, 50],
    ['right', 'R', 144, 50],
  ],
  bulb: [
    ['left', 'L', -64, 0],
    ['right', 'R', 52, 0],
  ],
};

export type CircuitTerminal = {
  id: string;
  componentId: string;
  componentType: CircuitComponentType;
  label: string;
  x: number;
  y: number;
};

export const buildTerminals = (template: CircuitTemplate): CircuitTerminal[] =>
  template.components.flatMap((component) =>
    terminalSuffixes[component.type].map(([suffix, label, dx, dy]) => ({
      id: `${component.id}.${suffix}`,
      componentId: component.id,
      componentType: component.type,
      label,
      x: component.x + dx,
      y: component.y + dy,
    }))
  );

export const getPrimaryComponentIds = (template: CircuitTemplate) => {
  const primary = Object.fromEntries(
    componentOrder.map((type) => [
      type,
      template.components.find((component) => component.type === type)?.id ?? null,
    ])
  ) as Record<CircuitComponentType, string | null>;

  return primary;
};

export const getRequiredConnections = (template: CircuitTemplate) => {
  const primary = getPrimaryComponentIds(template);

  if (!primary.battery || !primary.switch || !primary.bulb) {
    return [];
  }

  return [
    [`${primary.battery}.positive`, `${primary.switch}.left`],
    [`${primary.switch}.right`, `${primary.bulb}.left`],
    [`${primary.bulb}.right`, `${primary.battery}.negative`],
  ] as Array<[string, string]>;
};
