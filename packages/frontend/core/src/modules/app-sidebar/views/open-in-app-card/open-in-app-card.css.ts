import { cssVar } from '@toeverything/theme';
import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';

export const root = style({
  background: cssVarV2('layer/background/primary'),
  borderRadius: '8px',
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  cursor: 'default',
  userSelect: 'none',
});

export const pane = style({
  padding: '10px 12px',
  display: 'flex',
  flexDirection: 'column',
  rowGap: 6,
  selectors: {
    '&:not(:last-of-type)': {
      borderBottom: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
    },
  },
});

export const row = style({
  fontSize: cssVar('fontSm'),
  fontWeight: 400,
  display: 'flex',
  alignItems: 'center',
  columnGap: 10,
  color: cssVarV2('text/secondary'),
});

export const clickableRow = style([
  row,
  {
    cursor: 'pointer',
  },
]);

export const buttonGroup = style({
  display: 'flex',
  gap: 4,
});

export const button = style({
  height: 26,
  borderRadius: 4,
  padding: '0 8px',
});

export const primaryRow = style([
  row,
  {
    color: cssVarV2('text/primary'),
  },
]);

export const icon = style({
  width: 20,
  height: 20,
  flexShrink: 0,
  fontSize: 20,
  selectors: {
    [`${primaryRow} &`]: {
      color: cssVarV2('icon/activated'),
    },
  },
});
