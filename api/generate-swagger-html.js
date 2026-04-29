const fs = require("fs");
const path = require("path");
const spec = fs.readFileSync(path.resolve(__dirname, "tmp-swagger.json"), "utf8");
const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>SwaggerUI Test</title>
  <link rel="stylesheet" type="text/css" href="node_modules/swagger-ui-dist/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="node_modules/swagger-ui-dist/swagger-ui-bundle.js"></script>
  <script>
    const spec = ${spec};
    SwaggerUIBundle({
      dom_id: '#swagger-ui',
      spec,
      deepLinking: true,
    });
  </script>
</body>
</html>`;
fs.writeFileSync(path.resolve(__dirname, "tmp-swagger-embedded.html"), html);
