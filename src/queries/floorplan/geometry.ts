import raw from "./floors.dax?raw";
import propertiesRaw from "./properties.dax?raw";
import shapesRaw from "./shapes.dax?raw";
import unitsRaw from "./units.dax?raw";
import { CONNECTION, type ColumnMetadataMap } from "../helpers";

export const floorColumns: ColumnMetadataMap = {
    "Floor[Floor Key]": { name: "floorKey" },
    "Floor[Property Key]": { name: "propertyKey" },
    "Floor[Level Number]": { name: "levelNumber" },
    "Floor[Level Label]": { name: "levelLabel" },
    "Floor[Floor Type]": { name: "floorType" },
    "Floor[Sort Order]": { name: "sortOrder" },
    "Floor[Gla m2]": { name: "gla" },
};

export const shapeColumns: ColumnMetadataMap = {
    "Floor Shape[Shape Key]": { name: "shapeKey" },
    "Floor Shape[Floor Key]": { name: "floorKey" },
    "Floor Shape[Shape Type]": { name: "shapeType" },
    "Floor Shape[Shape Name]": { name: "shapeName" },
    "Floor Shape[Points]": { name: "points" },
};

export const unitColumns: ColumnMetadataMap = {
    "Unit[Unit Key]": { name: "unitKey" },
    "Unit[Property Key]": { name: "propertyKey" },
    "Unit[Floor Key]": { name: "floorKey" },
    "Unit[Zone Key]": { name: "zoneKey" },
    "Unit[Unit Code]": { name: "unitCode" },
    "Unit[Area m2]": { name: "area" },
    "Unit[Category]": { name: "category" },
    "Unit[Unit Type]": { name: "unitType" },
    "Unit[Is Anchor]": { name: "isAnchor" },
    "Unit[ERV Per m2 Month]": { name: "erv" },
    "Unit[Centroid X]": { name: "cx" },
    "Unit[Centroid Y]": { name: "cy" },
    "Unit[Polygon Points]": { name: "polygon" },
};

export const propertyColumns: ColumnMetadataMap = {
    "Property[Property Key]": { name: "propertyKey" },
    "Property[Property Name]": { name: "propertyName" },
    "Property[City]": { name: "city" },
    "Property[District]": { name: "district" },
    "Property[Retail Floors]": { name: "retailFloors" },
    "Property[Floors Total]": { name: "floorsTotal" },
    "Property[Year Built]": { name: "yearBuilt" },
    "Property[Gla m2]": { name: "gla" },
};

export interface PropertyRow {
    propertyKey: number;
    propertyName: string;
    city: string;
    district: string;
    retailFloors: number;
    floorsTotal: number;
    yearBuilt: number;
    gla: number;
}

export interface FloorRow {
    floorKey: number;
    propertyKey: number;
    levelNumber: number;
    levelLabel: string;
    floorType: "Retail" | "Office" | "Parking";
    sortOrder: number;
    gla: number;
}

export interface ShapeRow {
    shapeKey: number;
    floorKey: number;
    shapeType: "outline" | "atrium" | "concourse" | "entrance";
    shapeName: string;
    points: string;
}

export interface UnitRow {
    unitKey: number;
    propertyKey: number;
    floorKey: number;
    zoneKey: number;
    unitCode: string;
    area: number;
    category: string;
    unitType: string;
    isAnchor: boolean;
    erv: number;
    cx: number;
    cy: number;
    polygon: string;
}

export function propertiesQuery() {
    return { connection: CONNECTION, query: propertiesRaw, columnMetadata: propertyColumns };
}

export function floorsQuery() {
    return { connection: CONNECTION, query: raw, columnMetadata: floorColumns };
}

export function shapesQuery() {
    return { connection: CONNECTION, query: shapesRaw, columnMetadata: shapeColumns };
}

export function unitsQuery() {
    return { connection: CONNECTION, query: unitsRaw, columnMetadata: unitColumns };
}
