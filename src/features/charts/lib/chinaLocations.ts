import pcaa from "area-data/pcaa";

export interface ChinaDistrict {
  name: string;
}

export interface ChinaCity {
  name: string;
  districts: ChinaDistrict[];
}

export interface ChinaProvince {
  name: string;
  cities: ChinaCity[];
}

type AreaTree = Record<string, Record<string, string> | undefined>;

const CHINA_ROOT_CODE = "86";
const HONG_KONG_MACAU_GROUP_CODE = "910000";
const MUNICIPALITY_CODES = new Set(["110000", "120000", "310000", "500000"]);
const areaTree = pcaa as AreaTree;

export const CHINA_LOCATIONS: ChinaProvince[] = buildChinaLocations();

function buildChinaLocations(): ChinaProvince[] {
  const root = areaTree[CHINA_ROOT_CODE] ?? {};
  return Object.entries(root).flatMap(([provinceCode, provinceName]) => {
    if (provinceCode === HONG_KONG_MACAU_GROUP_CODE) {
      return buildHongKongMacauLocations(provinceCode);
    }

    return [buildProvince(provinceCode, provinceName)];
  });
}

function buildHongKongMacauLocations(groupCode: string): ChinaProvince[] {
  const regions = areaTree[groupCode] ?? {};
  return Object.entries(regions).map(([regionCode, regionName]) => ({
    name: regionName,
    cities: [
      {
        name: regionName,
        districts: mapDistricts(regionCode, regionName),
      },
    ],
  }));
}

function buildProvince(provinceCode: string, provinceName: string): ChinaProvince {
  const cityMap = areaTree[provinceCode] ?? {};
  const cities = Object.entries(cityMap).map(([cityCode, cityName]) => ({
    name: normalizeCityName(provinceCode, provinceName, cityName),
    districts: mapDistricts(cityCode, normalizeCityName(provinceCode, provinceName, cityName)),
  }));

  return {
    name: provinceName,
    cities: cities.length > 0 ? cities : [{ name: provinceName, districts: mapDistricts(provinceCode, provinceName) }],
  };
}

function normalizeCityName(provinceCode: string, provinceName: string, cityName: string) {
  if (MUNICIPALITY_CODES.has(provinceCode) && cityName === "市辖区") {
    return provinceName;
  }

  return cityName;
}

function mapDistricts(parentCode: string, fallbackName: string): ChinaDistrict[] {
  const districts = Object.values(areaTree[parentCode] ?? {});

  if (districts.length === 0) {
    return [{ name: fallbackName }];
  }

  return districts.map((name) => ({ name }));
}
