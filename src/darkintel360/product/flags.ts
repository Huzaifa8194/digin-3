// Flag artwork (flag-icons, MIT). Only the countries the product screens use are bundled.
const urls = import.meta.glob('/node_modules/flag-icons/flags/4x3/{af,al,dz,ar,am,au,at,az,bh,bd,it,us,pk,fr,in,de,id,cn,uy,br,es,gb,ir,vn,za,ga,co,ph,jp,nl,sg}.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export const flagUrl = (cc: string) => urls[`/node_modules/flag-icons/flags/4x3/${cc}.svg`] || '';
