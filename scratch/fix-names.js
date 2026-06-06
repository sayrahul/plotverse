const fs = require('fs');
let svg = fs.readFileSync('public/data/plot.svg', 'utf8');

svg = svg.replace(/<g([^>]+data-name="([^"]+)"[^>]*)>([\s\S]*?)<\/g>/g, (match, gAttrs, dataName, inner) => {
  const textMatch = inner.match(/<text[^>]*>[\s\S]*?<tspan[^>]*>(\d+)<\/tspan>[\s\S]*?<\/text>/);
  if (textMatch) {
    const textNumber = textMatch[1];
    if (dataName !== textNumber) {
      console.log("Fixing mismatch: data-name=" + dataName + " -> " + textNumber + "");
      const newAttrs = gAttrs.replace("data-name=\"" + dataName + "\"", "data-name=\"" + textNumber + "\"");
      return "<g" + newAttrs + ">" + inner + "<\/g>";
    }
  }
  return match;
});

fs.writeFileSync('public/data/plot.svg', svg);
