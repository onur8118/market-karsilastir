export function extractVolumeInfo(name) {
    const match = name.toLowerCase().match(/(\d+([.,]\d+)?)\s*(l|ml|g|gr|kg|adet|rulo)\b/);
    if (!match) return null;

    let value = parseFloat(match[1].replace(',', '.'));
    let unit = match[3].replace('gr', 'g').toLowerCase();

    // Standardize to base units (L or kg)
    let standardValue = value;
    let standardUnit = unit;

    if (unit === 'ml') {
        standardValue = value / 1000;
        standardUnit = 'l';
    } else if (unit === 'g') {
        standardValue = value / 1000;
        standardUnit = 'kg';
    }

    return {
        originalValue: value,
        originalUnit: unit,
        standardValue,
        standardUnit
    };
}

export function calculateUnitPrice(price, volumeInfo) {
    if (!volumeInfo || !volumeInfo.standardValue || volumeInfo.standardValue === 0) return null;

    const unitPrice = price / volumeInfo.standardValue;
    return {
        price: unitPrice,
        label: `₺/${volumeInfo.standardUnit}`
    };
}
