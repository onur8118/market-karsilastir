export const markets = [
  {
    id: 'a101',
    name: 'A101',
    color: '#0057A8',
    bgColor: '#E8F1FA',
    logo: 'https://upload.wikimedia.org/wikipedia/tr/thumb/8/86/A101_logo.svg/1200px-A101_logo.svg.png'
  },
  {
    id: 'sok',
    name: 'ŞOK',
    color: '#FFD100',
    bgColor: '#FFF9E0',
    logo: 'https://upload.wikimedia.org/wikipedia/tr/thumb/7/7b/%C5%9Eok_marketler_logo.svg/1200px-%C5%9Eok_marketler_logo.svg.png'
  },
  {
    id: 'migros',
    name: 'Migros',
    color: '#F26F21',
    bgColor: '#FEF0E6',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Migros_Logo.svg/1200px-Migros_Logo.svg.png'
  },
  {
    id: 'carrefoursa',
    name: 'CarrefourSA',
    color: '#004E9A',
    bgColor: '#E6EEF6',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/CarrefourSA_logo.svg/1200px-CarrefourSA_logo.svg.png'
  },
  {
    id: 'metro',
    name: 'Metro',
    color: '#003D7C',
    bgColor: '#E6ECF3',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Metro_Logo.svg/1200px-Metro_Logo.svg.png'
  },
  {
    id: 'file',
    name: 'File',
    color: '#009b4c',
    bgColor: '#e6f5ed',
    logo: 'https://www.file.com.tr/assets/images/file-logo.png'
  },
  {
    id: 'bizim',
    name: 'Bizim Toptan',
    color: '#004a99',
    bgColor: '#e6edf5',
    logo: 'https://www.bizimtoptan.com.tr/Assets/Images/bizim-toptan-logo.svg'
  },
  {
    id: 'mopas',
    name: 'Mopaş',
    color: '#E30613',
    bgColor: '#FCE8EA',
    logo: 'https://mopas.com.tr/assets/images/logo.png'
  }
];

export function getMarketById(id) {
  return markets.find(m => m.id === id);
}
