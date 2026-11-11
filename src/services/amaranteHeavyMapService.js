// src/services/amaranteHeavyMapService.js — Contexto Cartográfico OSM de Amarante para Pesados (Zero Alucinação)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from '../utils/logger.js';

const log = createLogger('AmaranteHeavyMap');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OSM_PATH = path.resolve(__dirname, '../../assets/maps/amarante.osm');

class AmaranteHeavyMapService {
  constructor(osmPath = DEFAULT_OSM_PATH) {
    this.osmPath = osmPath;
    this.isLoaded = false;
    this.bounds = null;
    this.streets = [];
    this.busStops = [];
  }

  loadData() {
    if (this.isLoaded) return true;
    if (!fs.existsSync(this.osmPath)) {
      log.warn(`Mapa OSM de Amarante não encontrado em ${this.osmPath}`);
      return false;
    }

    try {
      const xml = fs.readFileSync(this.osmPath, 'utf8');
      const boundsMatch = xml.match(
        /<bounds\s+minlat="([^"]+)"\s+minlon="([^"]+)"\s+maxlat="([^"]+)"\s+maxlon="([^"]+)"/
      );
      if (boundsMatch) {
        this.bounds = {
          minLat: parseFloat(boundsMatch[1]),
          minLon: parseFloat(boundsMatch[2]),
          maxLat: parseFloat(boundsMatch[3]),
          maxLon: parseFloat(boundsMatch[4])
        };
      }

      const nodeBlockRegex = /<node\s+id="(\d+)"[^>]*lat="([^"]+)"\s+lon="([^"]+)"[^>]*>([\s\S]*?)<\/node>/g;
      let nodeMatch;
      while ((nodeMatch = nodeBlockRegex.exec(xml)) !== null) {
        const tagBlock = nodeMatch[4];
        const tags = {};
        const tagRegex = /<tag\s+k="([^"]+)"\s+v="([^"]+)"\/>/g;
        let t;
        while ((t = tagRegex.exec(tagBlock)) !== null) {
          tags[t[1]] = t[2];
        }
        if (tags.highway === 'bus_stop' || tags.bus === 'yes') {
          this.busStops.push({
            id: nodeMatch[1],
            name: tags.name || tags['name:pt'] || 'Paragem sem nome'
          });
        }
      }

      const wayBlockRegex = /<way\s+id="(\d+)"[^>]*>([\s\S]*?)<\/way>/g;
      let wayMatch;
      while ((wayMatch = wayBlockRegex.exec(xml)) !== null) {
        const tagBlock = wayMatch[2];
        const tags = {};
        const tagRegex = /<tag\s+k="([^"]+)"\s+v="([^"]+)"\/>/g;
        let t;
        while ((t = tagRegex.exec(tagBlock)) !== null) {
          tags[t[1]] = t[2];
        }
        if (tags.highway || tags.name) {
          this.streets.push({
            id: wayMatch[1],
            name: tags.name || tags['name:pt'] || 'Via sem nome',
            highway: tags.highway || 'unclassified',
            oneway: tags.oneway === 'yes',
            maxweight: tags.maxweight || null,
            maxheight: tags.maxheight || null,
            maxspeed: tags.maxspeed || null
          });
        }
      }

      this.isLoaded = true;
      log.info(
        `[OSM Amarante] ${this.streets.length} vias e ${this.busStops.length} paragens carregadas.`
      );
      return true;
    } catch (err) {
      log.error('Erro ao analisar amarante.osm:', err.message);
      return false;
    }
  }

  isAmaranteQuery(text = '') {
    return /\bamarante\b/i.test(String(text));
  }

  getHeavyVehicleCorridors() {
    if (!this.loadData()) {
      return { loaded: false, primary: [], secondary: [], restrictions: [], busStopsCount: 0 };
    }

    const named = (level) =>
      [
        ...new Set(
          this.streets
            .filter((s) => s.highway === level && s.name && s.name !== 'Via sem nome')
            .map((s) => s.name)
        )
      ];

    const restrictions = this.streets
      .filter((s) => s.maxweight || s.maxheight)
      .map((s) => ({
        name: s.name,
        maxweight: s.maxweight,
        maxheight: s.maxheight
      }));

    return {
      loaded: true,
      primary: named('primary'),
      secondary: named('secondary'),
      restrictions,
      busStopsCount: this.busStops.length,
      streetsCount: this.streets.length
    };
  }

  formatAmaranteHeavyNote() {
    const info = this.getHeavyVehicleCorridors();
    if (!info.loaded) return '';

    const corridors = info.primary.concat(info.secondary).slice(0, 6);
    const restrText =
      info.restrictions.length > 0
        ? info.restrictions
            .slice(0, 4)
            .map(
              (r) =>
                `${r.name} (${[r.maxweight ? `peso máx ${r.maxweight}` : null, r.maxheight ? `altura máx ${r.maxheight}` : null].filter(Boolean).join(', ')})`
            )
            .join('; ')
        : 'Sem tags maxweight/maxheight no excerto OSM (validar sinalização vertical no local).';

    return (
      `🗺️ *Cartografia OSM Amarante (CIM Tâmega e Sousa):*\n` +
      `• *Vias Principais/Secundárias:* ${corridors.join(', ') || 'Corredores principais locais'}\n` +
      `• *Paragens de Autocarro Mapeadas:* ${info.busStopsCount}\n` +
      `• *Restrições Físicas OSM:* ${restrText}`
    );
  }
}

export const amaranteHeavyMapService = new AmaranteHeavyMapService();
export default amaranteHeavyMapService;
