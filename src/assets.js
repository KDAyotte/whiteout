// CC0 textures and HDRI from Poly Haven (polyhaven.com), embedded at build time.
import cabinHdr from '../assets/cabin_1k.hdr';
import woodDiff from '../assets/wood_table_worn_diff_2k.jpg';
import woodNor from '../assets/wood_table_worn_nor_gl_2k.jpg';
import woodRough from '../assets/wood_table_worn_rough_2k.jpg';
import snowDiff from '../assets/snow_02_diff_1k.jpg';
import snowNor from '../assets/snow_02_nor_gl_1k.jpg';
import snowRough from '../assets/snow_02_rough_1k.jpg';
import leatherNor from '../assets/fabric_leather_02_nor_gl_1k.jpg';
import leatherRough from '../assets/fabric_leather_02_rough_1k.jpg';

// Miniatures generated with Meshy (image-to-3D), textures resized to 1024px WebP.
import zombieGlb from '../assets/minis-web/zombie.glb';
import maraGlb from '../assets/minis-web/mara.glb';
import jonasGlb from '../assets/minis-web/jonas.glb';
import priyaGlb from '../assets/minis-web/priya.glb';
import tuckGlb from '../assets/minis-web/tuck.glb';
import snowcatGlb from '../assets/minis-web/snowcat.glb';
import heliGlb from '../assets/minis-web/helicopter.glb';

export const ASSETS = { cabinHdr, woodDiff, woodNor, woodRough, snowDiff, snowNor, snowRough, leatherNor, leatherRough };
export const MODELS = { zombie: zombieGlb, mara: maraGlb, jonas: jonasGlb, priya: priyaGlb, tuck: tuckGlb, snowcat: snowcatGlb, helicopter: heliGlb };
