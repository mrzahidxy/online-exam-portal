const fs = require("fs");
const path = require("path");
const { swaggerSpec, swaggerUiOptions } = require("./dist/middleware/swagger.middleware.js");
const specJson = JSON.stringify(swaggerSpec);
const swaggerOptions = swaggerUiOptions.swaggerOptions || {};
const onCompleteSrc = swaggerOptions.onComplete ? swaggerOptions.onComplete.toString() : 'undefined';
const requestInterceptorSrc = swaggerOptions.requestInterceptor ? swaggerOptions.requestInterceptor.toString() : 'undefined';
const responseInterceptorSrc = swaggerOptions.responseInterceptor ? swaggerOptions.responseInterceptor.toString() : 'undefined';
const persistAuthorization = swaggerOptions.persistAuthorization ? 'true' : 'false';
const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>SwaggerUI Test with Middleware</title>
  <link rel="stylesheet" type="text/css" href="node_modules/swagger-ui-dist/swagger-ui.css" />
  <style>
    body { margin: 0; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="node_modules/swagger-ui-dist/swagger-ui-bundle.js"></script>
  <script>
    const spec = ${specJson};
    const onComplete = ${onCompleteSrc};
    const requestInterceptor = ${requestInterceptorSrc};
    const responseInterceptor = ${responseInterceptorSrc};
    SwaggerUIBundle({
      dom_id: '#swagger-ui',
      spec,
      deepLinking: true,
      persistAuthorization: ${persistAuthorization},
      onComplete,
      requestInterceptor,
      responseInterceptor,
    });
  </script>
</body>
</html>`;
fs.writeFileSync(path.resolve(__dirname, "tmp-swagger-middleware.html"), html);
