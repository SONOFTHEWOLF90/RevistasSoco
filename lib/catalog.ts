import catalogData from "../catalogo.json";

export type Magazine = {
  id: string;
  estado: string;
  editorial: string;
  collection: string;
  issue: string;
  name: string;
  archivo: string;
  ruta: string;
  paginas?: number;
  r2_path?: string;
  prefix?: string;
  cover?: string;
  fecha_importacion?: string;
};

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9áéíóúüñ-]/g, "")
    .replace(/-+/g, "-");
}

function createMagazineId(magazine: {
  editorial: string;
  coleccion: string;
  numero: string;
  nombre: string;
  ruta: string;
}) {
  const base = magazine.coleccion
    ? `${magazine.editorial}-${magazine.coleccion}-${
        magazine.numero || magazine.nombre
      }`
    : `${magazine.editorial}-${magazine.nombre}`;

  return `${slugify(base)}-${slugify(magazine.ruta).slice(-30)}`;
}

/**
 * Nombre que mostramos al usuario para una colección.
 *
 * En el catálogo original:
 *   *div = Diversos
 *
 * Conservamos "*div" internamente para no modificar catalogo.json.
 */
export function displayCollection(collection: string) {
  if (collection.trim().toLowerCase() === "*div") {
    return "Diversos";
  }

  return collection;
}

export const magazines: Magazine[] = catalogData.map((magazine) => ({
  id: createMagazineId(magazine),
  estado: magazine.estado,
  editorial: magazine.editorial,
  collection: magazine.coleccion,
  issue: magazine.numero,
  name: magazine.nombre,
  archivo: magazine.archivo,
  ruta: magazine.ruta,
  paginas: magazine.paginas,
  r2_path: magazine.r2_path,
  prefix: magazine.prefix,
  cover: magazine.cover,
  fecha_importacion: magazine.fecha_importacion,
}));

const R2_PUBLIC_URL =
  "https://pub-1b95b888405e48679764699751c3bf8f.r2.dev";

function slugifyPath(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
}

export function magazineCoverUrl(magazine: Magazine) {
  if (magazine.r2_path) {
    return `${R2_PUBLIC_URL}/${magazine.r2_path}/cover.webp`;
  }

  const editorial = slugifyPath(magazine.editorial);
  const collection = slugifyPath(magazine.collection);
  const issue = slugifyPath(magazine.issue || magazine.name);

  return `${R2_PUBLIC_URL}/magazines/${editorial}/${collection}/${issue}/cover.webp`;
}

export function magazineR2Path(magazine: Magazine) {
  if (magazine.r2_path) {
    return magazine.r2_path;
  }

  const editorial = slugifyPath(magazine.editorial);
  const collection = slugifyPath(magazine.collection);
  const issue = slugifyPath(magazine.issue || magazine.name);

  return `magazines/${editorial}/${collection}/${issue}`;
}
