import fs from "fs";
import path from "path";

const CATALOG_PATH = path.resolve("catalogo.json");

if (!fs.existsSync(CATALOG_PATH)) {
  console.error(`No se encontró: ${CATALOG_PATH}`);
  process.exit(1);
}

const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));

console.log("");
console.log("========================================");
console.log("       AUDITORÍA DE CATÁLOGO");
console.log("========================================");
console.log("");

console.log(`Total de revistas: ${catalog.length}`);
console.log("");

/*
 * ---------------------------------------------------------
 * 1. R2 PATH DUPLICADOS
 * ---------------------------------------------------------
 */

const byR2 = new Map();

for (const magazine of catalog) {
  if (!magazine.r2_path) continue;

  if (!byR2.has(magazine.r2_path)) {
    byR2.set(magazine.r2_path, []);
  }

  byR2.get(magazine.r2_path).push(magazine);
}

const duplicateR2 = [...byR2.entries()].filter(
  ([, magazines]) => magazines.length > 1,
);

console.log("========================================");
console.log("1. R2 PATH DUPLICADOS");
console.log("========================================");
console.log("");

if (duplicateR2.length === 0) {
  console.log("✓ No hay r2_path duplicados.");
} else {
  for (const [r2Path, magazines] of duplicateR2) {
    console.log(`R2: ${r2Path}`);

    for (const magazine of magazines) {
      console.log(
        `  - ${magazine.editorial} | ${magazine.coleccion} | Nº ${magazine.numero} | ${magazine.nombre} | ${magazine.archivo}`,
      );
    }

    console.log("");
  }
}

/*
 * ---------------------------------------------------------
 * 2. COLECCIONES *div
 * ---------------------------------------------------------
 */

const divMagazines = catalog.filter(
  (magazine) =>
    String(magazine.coleccion ?? "")
      .trim()
      .toLowerCase() === "*div",
);

console.log("========================================");
console.log("2. COLECCIÓN *div");
console.log("========================================");
console.log("");

if (divMagazines.length === 0) {
  console.log("✓ No hay revistas con colección *div.");
} else {
  for (const magazine of divMagazines) {
    console.log(
      `${magazine.editorial} | ${magazine.coleccion} | Nº ${magazine.numero || "(vacío)"} | ${magazine.nombre} | ${magazine.archivo}`,
    );
  }
}

console.log("");

/*
 * ---------------------------------------------------------
 * 3. NÚMEROS VACÍOS
 * ---------------------------------------------------------
 */

const emptyNumbers = catalog.filter(
  (magazine) => !String(magazine.numero ?? "").trim(),
);

console.log("========================================");
console.log("3. NÚMEROS VACÍOS");
console.log("========================================");
console.log("");

if (emptyNumbers.length === 0) {
  console.log("✓ No hay números vacíos.");
} else {
  for (const magazine of emptyNumbers) {
    console.log(
      `${magazine.editorial} | ${magazine.coleccion} | ${magazine.nombre} | ${magazine.archivo}`,
    );
  }
}

console.log("");

/*
 * ---------------------------------------------------------
 * 4. NÚMERO IGUAL AL NOMBRE DE LA COLECCIÓN
 * ---------------------------------------------------------
 */

const suspiciousNumber = catalog.filter((magazine) => {
  const number = String(magazine.numero ?? "").trim().toLowerCase();
  const collection = String(magazine.coleccion ?? "")
    .trim()
    .toLowerCase();

  return number && collection && number === collection;
});

console.log("========================================");
console.log("4. NÚMERO = COLECCIÓN");
console.log("========================================");
console.log("");

if (suspiciousNumber.length === 0) {
  console.log("✓ No se encontraron casos.");
} else {
  for (const magazine of suspiciousNumber) {
    console.log(
      `${magazine.editorial} | ${magazine.coleccion} | Nº ${magazine.numero} | ${magazine.nombre} | ${magazine.archivo}`,
    );
  }
}

console.log("");

/*
 * ---------------------------------------------------------
 * 5. MISMA EDITORIAL + COLECCIÓN + NÚMERO
 * ---------------------------------------------------------
 *
 * IMPORTANTE:
 * Esto NO significa necesariamente que sean duplicados.
 *
 * Por ejemplo:
 * Classici 16 Women
 * Classici 16 Men
 *
 * Los queremos detectar para revisarlos.
 */

const byEditorialCollectionNumber = new Map();

for (const magazine of catalog) {
  const key = [
    magazine.editorial,
    magazine.coleccion,
    magazine.numero,
  ]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .join("|||");

  if (!byEditorialCollectionNumber.has(key)) {
    byEditorialCollectionNumber.set(key, []);
  }

  byEditorialCollectionNumber.get(key).push(magazine);
}

const duplicateMetadata = [
  ...byEditorialCollectionNumber.entries(),
].filter(([, magazines]) => magazines.length > 1);

console.log("========================================");
console.log("5. MISMA EDITORIAL + COLECCIÓN + NÚMERO");
console.log("========================================");
console.log("");

if (duplicateMetadata.length === 0) {
  console.log("✓ No hay coincidencias.");
} else {
  for (const [, magazines] of duplicateMetadata) {
    const first = magazines[0];

    console.log(
      `${first.editorial} | ${first.coleccion} | Nº ${first.numero}`,
    );

    for (const magazine of magazines) {
      console.log(
        `  - ${magazine.nombre} | ${magazine.archivo} | ${magazine.ruta}`,
      );
    }

    console.log("");
  }
}

/*
 * ---------------------------------------------------------
 * 6. MISMA RUTA ORIGINAL
 * ---------------------------------------------------------
 */

const bySourcePath = new Map();

for (const magazine of catalog) {
  const sourcePath = String(magazine.ruta ?? "")
    .trim()
    .toLowerCase();

  if (!sourcePath) continue;

  if (!bySourcePath.has(sourcePath)) {
    bySourcePath.set(sourcePath, []);
  }

  bySourcePath.get(sourcePath).push(magazine);
}

const duplicateSourcePaths = [...bySourcePath.entries()].filter(
  ([, magazines]) => magazines.length > 1,
);

console.log("========================================");
console.log("6. RUTAS ORIGINALES DUPLICADAS");
console.log("========================================");
console.log("");

if (duplicateSourcePaths.length === 0) {
  console.log("✓ No hay rutas originales duplicadas.");
} else {
  for (const [sourcePath, magazines] of duplicateSourcePaths) {
    console.log(`Ruta: ${sourcePath}`);

    for (const magazine of magazines) {
      console.log(
        `  - ${magazine.editorial} | ${magazine.coleccion} | Nº ${magazine.numero} | ${magazine.nombre}`,
      );
    }

    console.log("");
  }
}

/*
 * ---------------------------------------------------------
 * 7. RESUMEN
 * ---------------------------------------------------------
 */

console.log("========================================");
console.log("RESUMEN");
console.log("========================================");
console.log("");

console.log(`Total revistas:                 ${catalog.length}`);
console.log(`R2 duplicados:                  ${duplicateR2.length}`);
console.log(`Colección *div:                 ${divMagazines.length}`);
console.log(`Números vacíos:                 ${emptyNumbers.length}`);
console.log(`Número = colección:             ${suspiciousNumber.length}`);
console.log(
  `Metadatos editorial/colección/nº: ${duplicateMetadata.length}`,
);
console.log(
  `Rutas originales duplicadas:     ${duplicateSourcePaths.length}`,
);

console.log("");
console.log("========================================");
console.log("AUDITORÍA TERMINADA");
console.log("========================================");
