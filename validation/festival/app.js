'use strict';

const FESTIVAL_EVENTS = {
  kitchen: { title: 'Открытая кухня', hour: 13, zone: 'Огонь' },
  talk: { title: 'Разговор о локальных продуктах', hour: 15, zone: 'Тесто' },
  dinner: { title: 'Ужин у воды', hour: 18, zone: 'Огонь' },
  music: { title: 'Музыка', hour: 20, zone: 'Холод' }
};
const ZONE_COPY = {
  all: 'Три зоны, четыре повода задержаться. Все события по времени Казани.',
  fire: 'Огонь — блюда на гриле. Открытая кухня днём, ужин у воды вечером.',
  dough: 'Тесто — выпечка. В 15:00 говорим о локальных продуктах.',
  cold: 'Холод — напитки и десерты. В 20:00 встречаем вечер с музыкой.'
};

function escapeICS(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
}

// RFC 5545: fold content lines at 75 octets, without splitting a UTF-8 character.
function foldICS(line) {
  const encoder = new TextEncoder();
  let output = '';
  let width = 0;
  for (const character of line) {
    const bytes = encoder.encode(character).length;
    if (width + bytes > 75) {
      output += '\r\n ';
      width = 1;
    }
    output += character;
    width += bytes;
  }
  return output;
}

function createCalendar(eventId, now = new Date()) {
  const event = FESTIVAL_EVENTS[eventId];
  if (!event) throw new Error('Неизвестное событие');
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const utcHour = String(event.hour - 3).padStart(2, '0');
  const description = `Демонстрационный фестиваль Крошка. Это выдуманное событие, не реальное объявление. Зона: ${event.zone}. Начало по времени Казани (UTC+3). Время окончания события не задано.`;
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kroshka Demo//Festival//RU',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    `UID:kroshka-demo-20270816-${eventId}@example.invalid`, `DTSTAMP:${stamp}`,
    `DTSTART:20270816T${utcHour}0000Z`,
    `SUMMARY:${escapeICS(`Крошка (демо) — ${event.title}`)}`,
    `LOCATION:${escapeICS('Казань, набережная Кабана')}`,
    `DESCRIPTION:${escapeICS(description)}`, 'TRANSP:TRANSPARENT',
    'END:VEVENT', 'END:VCALENDAR'
  ].map(foldICS).join('\r\n') + '\r\n';
}

function initFestival() {
  const controls = document.querySelector('.zone-controls');
  const buttons = [...document.querySelectorAll('[data-zone][aria-pressed]')];
  const rows = [...document.querySelectorAll('.event')];
  const filterStatus = document.querySelector('#filter-status');
  const downloadStatus = document.querySelector('.download-status');
  controls.hidden = false;

  function setZone(zone, announce = true) {
    if (!Object.hasOwn(ZONE_COPY, zone)) zone = 'all';
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.zone === zone)));
    rows.forEach(row => { row.hidden = zone !== 'all' && row.dataset.zone !== zone; });
    document.querySelector('#zone-description').textContent = ZONE_COPY[zone];
    const shown = rows.filter(row => !row.hidden).length;
    if (announce) filterStatus.textContent = `Показано событий: ${shown}. ${ZONE_COPY[zone]}`;
    downloadStatus.textContent = '';
  }

  buttons.forEach(button => button.addEventListener('click', () => setZone(button.dataset.zone)));
  document.querySelectorAll('[data-calendar]').forEach(button => {
    button.hidden = false;
    button.addEventListener('click', () => {
      const eventId = button.dataset.calendar;
      let objectURL;
      try {
        const blob = new Blob([createCalendar(eventId)], { type: 'text/calendar;charset=utf-8' });
        objectURL = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectURL;
        link.download = `kroshka-demo-${eventId}-2027-08-16.ics`;
        document.body.append(link);
        link.click();
        link.remove();
        downloadStatus.textContent = `Файл для «${FESTIVAL_EVENTS[eventId].title}» подготовлен. Откройте .ics в приложении календаря. Событие демонстрационное.`;
      } catch (error) {
        downloadStatus.textContent = 'Не удалось подготовить файл. Попробуйте скачать его ещё раз.';
      } finally {
        if (objectURL) setTimeout(() => URL.revokeObjectURL(objectURL), 30000);
      }
    });
  });
  setZone('all', false);
}

if (typeof document !== 'undefined') initFestival();
if (typeof module !== 'undefined') module.exports = { createCalendar, escapeICS, foldICS, FESTIVAL_EVENTS };
