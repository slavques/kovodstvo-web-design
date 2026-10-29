'use strict';

(() => {
  const $ = (id) => document.getElementById(id);
  const form = $('panel-form');
  const widthInput = $('panel-width');
  const heightInput = $('panel-height');
  const downloadButton = $('download-brief');
  const materials = {
    graphite: { name: 'Графит', color: '#3b4141' },
    moss: { name: 'Мох', color: '#536447' },
    ochre: { name: 'Охра', color: '#bd7539' }
  };
  const fmt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
  let current = { width: 900, height: 1200, material: 'moss', room: 'Домашняя студия' };
  let announceTimer;
  let downloadUrl;

  // Static, deterministic felt line work. No network, canvas, assets, or libraries.
  for (let index = 0; index < 22; index++) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const y = index * 37 - 80;
    line.setAttribute('d', `M0 ${y}C170 ${y - 95} 170 ${y + 95} 390 ${y}S610 ${y - 95} 780 ${y}`);
    $('panel-graphic').append(line);
  }

  function validDimension(input) {
    const value = Number(input.value);
    return input.value.trim() !== '' && Number.isFinite(value) && value >= 200 && value <= 2400 && Number.isInteger(value);
  }

  function drawPanel() {
    const { width, height, material } = current;
    const name = materials[material].name;
    const scale = Math.min(510 / width, 420 / height);
    const w = width * scale;
    const h = height * scale;
    const x = 390 - w / 2;
    const y = 310 - h / 2;
    for (const id of ['panel-shape', 'panel-texture', 'clip-rect']) {
      const element = $(id);
      for (const [key, value] of Object.entries({ x, y, width: w, height: h })) element.setAttribute(key, value);
    }
    $('panel-shape').setAttribute('fill', materials[material].color);
    $('width-line').setAttribute('d', `M${x} ${y + h + 31}h${w}m${-w} -6v12m${w} -12v12`);
    $('height-line').setAttribute('d', `M${x + w + 31} ${y}v${h}m-6 ${-h}h12m-12 ${h}h12`);
    $('width-label').setAttribute('y', y + h + 61);
    $('width-label').textContent = `${fmt.format(width)} мм`;
    const labelX = x + w + 61;
    $('height-label').setAttribute('x', labelX);
    $('height-label').setAttribute('y', 310);
    $('height-label').setAttribute('transform', `rotate(-90 ${labelX} 310)`);
    $('height-label').textContent = `${fmt.format(height)} мм`;
    const dimensions = `${fmt.format(width)} × ${fmt.format(height)} мм`;
    const summary = `${name} · ${dimensions}`;
    $('preview-summary').textContent = summary;
    $('preview-material').textContent = `войлок, ${name.toLocaleLowerCase('ru-RU')}`;
    $('preview-area').textContent = `${fmt.format(width * height / 1000000)} м²`;
    $('preview-description').textContent = `Войлок, ${name.toLocaleLowerCase('ru-RU')}. Ширина ${width} миллиметров, высота ${height} миллиметров. Условная визуализация, масштаб подстраивается.`;
    $('brief-selection').textContent = `Войлок / ${name.toLocaleLowerCase('ru-RU')}`;
    $('brief-dimensions').textContent = dimensions;
    $('brief-room').textContent = current.room;
    clearTimeout(announceTimer);
    announceTimer = setTimeout(() => { $('config-status').textContent = `Превью обновлено: ${summary}.`; }, 400);
  }

  function update() {
    const validWidth = validDimension(widthInput);
    const validHeight = validDimension(heightInput);
    widthInput.setAttribute('aria-invalid', String(!validWidth));
    heightInput.setAttribute('aria-invalid', String(!validHeight));
    const valid = validWidth && validHeight;
    downloadButton.disabled = !valid;
    $('dimension-error').textContent = valid ? '' : 'Введите целое число от 200 до 2400 мм для каждой стороны. Превью сохраняет последний корректный размер.';
    $('download-status').textContent = valid ? 'Параметры попадут в файл вместе с вашими заметками.' : 'Чтобы скачать задание, исправьте размер в конструкторе выше.';
    current.material = form.elements.material.value;
    current.room = $('room').value;
    if (valid) {
      current.width = Number(widthInput.value);
      current.height = Number(heightInput.value);
    }
    drawPanel();
  }

  form.addEventListener('input', update);
  form.addEventListener('change', update);
  // This form never submits or navigates, even when Enter is pressed in a field.
  form.addEventListener('submit', (event) => { event.preventDefault(); update(); });
  $('notes').addEventListener('input', () => {
    if (!downloadButton.disabled) $('download-status').textContent = 'Заметки изменены. Скачайте задание, чтобы включить их в файл.';
  });

  downloadButton.addEventListener('click', () => {
    update();
    if (downloadButton.disabled) return;
    const material = materials[current.material].name;
    const notes = $('notes').value.trim() || 'Не указаны';
    const text = [
      'ТИХИЙ СЛОЙ — ЗАДАНИЕ ДЛЯ ОБСУЖДЕНИЯ',
      '',
      'Материал: войлок',
      `Оттенок: ${material}`,
      `Ширина: ${current.width} мм`,
      `Высота: ${current.height} мм`,
      `Площадь одной панели: ${fmt.format(current.width * current.height / 1000000)} м²`,
      `Пространство: ${current.room}`,
      '',
      'Что важно учесть:',
      notes,
      '',
      'Статус: предварительная идея, не заказ и не акустический расчёт.',
      'Цена, возможность изготовления, крепление и сроки уточняются после замера.',
      'Экран может искажать оттенок войлока.',
      'Файл создан локально в браузере. Данные мастерской не отправлялись.'
    ].join('\n');
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    downloadUrl = URL.createObjectURL(new Blob(['\uFEFF', text], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `Тихий-слой_${current.width}x${current.height}_${material.toLocaleLowerCase('ru-RU')}.txt`;
    document.body.append(link);
    link.click();
    link.remove();
    $('download-status').textContent = 'Файл подготовлен для скачивания. Если браузер запросит разрешение, сохраните его. Данные никуда не отправлялись.';
  });

  window.addEventListener('pagehide', () => {
    clearTimeout(announceTimer);
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  });
  update();
})();
