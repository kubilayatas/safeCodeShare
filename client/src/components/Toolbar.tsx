import type { ReactNode } from 'react';

type Props = {
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
};

export default function Toolbar({ left, center, right }: Props): JSX.Element {
  return (
    <div className="toolbar">
      <div className="toolbar-left">{left}</div>
      <div className="toolbar-center">{center}</div>
      <div className="toolbar-right">{right}</div>
    </div>
  );
}