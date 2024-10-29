import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';

export const header = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 8,
  padding: '10px 16px',
});
export const title = style({
  fontSize: 17,
  fontWeight: 600,
  lineHeight: '22px',
  letterSpacing: -0.43,
  color: cssVarV2('text/primary'),
});
