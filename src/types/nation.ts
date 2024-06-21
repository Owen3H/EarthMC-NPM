import { 
    Point2D,
    RawEntitySpawn, 
    RawEntityStats, 
    RawEntityStatus 
} from "../types.js"
import {Prettify} from "./util.js"

export type BaseNation = {
    name: string
    king: string
    towns: string[]
    residents: string[]
    area: number
    capital: NationCapital
}

export type Nation = Prettify<BaseNation & {
    uuid?: string
    board?: string
    wiki?: string
    status?: RawEntityStatus
    stats?: RawEntityStats
    spawn?: RawEntitySpawn
    ranks?: { [key: string]: string[] }
    allies?: string[]
    enemies?: string[]
    mapColorHexCode?: string
}>

export type NationCapital = Prettify<Point2D & {
    name: string
}>