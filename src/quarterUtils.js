import { pad } from './utils';

// Port of ynabsync/dates/dates.go GetCurrentQuarter
export function getCurrentQuarter(now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  let startMonth, endMonth, endDay;

  if (month <= 2) {
    startMonth = 0; endMonth = 2; endDay = 31;
  } else if (month <= 5) {
    startMonth = 3; endMonth = 5; endDay = 30;
  } else if (month <= 8) {
    startMonth = 6; endMonth = 8; endDay = 30;
  } else {
    startMonth = 9; endMonth = 11; endDay = 31;
  }

  return {
    start: `${year}-${pad(startMonth + 1)}-01`,
    end: `${year}-${pad(endMonth + 1)}-${pad(endDay)}`
  };
}
