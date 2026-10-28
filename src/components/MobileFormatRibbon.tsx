import React from 'react';
import {
  Bold, Italic, Heading1, Heading2, Heading3,
  Link, Image, Code, List, ListOrdered, Quote, Minus, Table, CheckSquare,
} from 'lucide-react';

interface MobileFormatRibbonProps {
  onFormat: (type: string) => void;
}

const FORMAT_ITEMS = [
  { icon: <Heading1 size={17} />, action: 'h1', label: 'H1' },
  { icon: <Heading2 size={17} />, action: 'h2', label: 'H2' },
  { icon: <Heading3 size={17} />, action: 'h3', label: 'H3' },
  { icon: <Bold size={17} />, action: 'bold', label: 'Bold' },
  { icon: <Italic size={17} />, action: 'italic', label: 'Italic' },
  { icon: <Code size={17} />, action: 'code', label: 'Code' },
  { icon: <Quote size={17} />, action: 'quote', label: 'Quote' },
  { icon: <CheckSquare size={17} />, action: 'task', label: 'Task' },
  { icon: <List size={17} />, action: 'ul', label: 'Bullet list' },
  { icon: <ListOrdered size={17} />, action: 'ol', label: 'Numbered list' },
  { icon: <Link size={17} />, action: 'link', label: 'Link' },
  { icon: <Image size={17} />, action: 'image', label: 'Image' },
  { icon: <Table size={17} />, action: 'table', label: 'Table' },
  { icon: <Minus size={17} />, action: 'hr', label: 'Divider' },
];

export const MobileFormatRibbon: React.FC<MobileFormatRibbonProps> = ({ onFormat }) => {
  return (
    <div className="mobile-ribbon" role="toolbar" aria-label="Mobile markdown formatting">
      <div className="mobile-ribbon__scroll">
        {FORMAT_ITEMS.map((item) => (
          <button
            key={item.action}
            type="button"
            className="mobile-ribbon__btn"
            onPointerDown={(e) => {
              // Prevent editor blur on mobile touch
              e.preventDefault();
              onFormat(item.action);
            }}
            title={item.label}
            aria-label={item.label}
          >
            {item.icon}
          </button>
        ))}
      </div>
    </div>
  );
};
