import { ReactNode } from 'react';

type Props = {
  query: string;
  onQueryChange: (value: string) => void;
  right?: ReactNode;
};

export default function Topbar({ query, onQueryChange, right }: Props) {
  return (
    <div className="topbar">
      <div className="search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        <input placeholder="Search Projects..." value={query} onChange={e => onQueryChange(e.target.value)} />
      </div>
      {right}
    </div>
  );
}


