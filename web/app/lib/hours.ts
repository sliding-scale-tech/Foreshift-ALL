// Bubble's Time_Slots option set: every full hour, "12:00 AM" … "11:00 PM".
export const TIME_SLOTS: string[] = Array.from({ length: 24 }, (_, h) => {
  const period = h < 12 ? "AM" : "PM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:00 ${period}`;
});
