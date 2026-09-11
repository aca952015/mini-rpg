// Canvas text helper shared by engine controls. Keep this module free of game data.
export function drawTextWithShadow(ctx, text, x, y, options = {}) {
  const inheritContext = options.inheritContext === true;
  const color = options.color !== undefined
    ? options.color
    : (inheritContext ? ctx.fillStyle : '#ffffff');
  const font = options.font !== undefined
    ? options.font
    : (inheritContext ? ctx.font : '14px PingFang SC, Microsoft YaHei, sans-serif');
  const textAlign = options.textAlign !== undefined
    ? options.textAlign
    : (inheritContext ? ctx.textAlign : 'left');
  const textBaseline = options.textBaseline !== undefined
    ? options.textBaseline
    : (inheritContext ? ctx.textBaseline : 'middle');
  const shadowColor = options.shadowColor !== undefined ? options.shadowColor : 'rgba(0, 0, 0, 0.5)';
  const shadowBlur = options.shadowBlur !== undefined ? options.shadowBlur : 2;
  const shadowOffsetX = options.shadowOffsetX !== undefined ? options.shadowOffsetX : 1;
  const shadowOffsetY = options.shadowOffsetY !== undefined ? options.shadowOffsetY : 1;
  const content = text == null ? '' : String(text);

  ctx.save();
  ctx.shadowColor = shadowColor;
  ctx.shadowBlur = shadowBlur;
  ctx.shadowOffsetX = shadowOffsetX;
  ctx.shadowOffsetY = shadowOffsetY;
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = textAlign;
  ctx.textBaseline = textBaseline;
  if (options.maxWidth !== undefined) {
    ctx.fillText(content, x, y, options.maxWidth);
  } else {
    ctx.fillText(content, x, y);
  }
  ctx.restore();
}
