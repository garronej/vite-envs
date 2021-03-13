<p align="center">
    <img src="https://user-images.githubusercontent.com/6702424/80216211-00ef5280-863e-11ea-81de-59f3a3d4b8e4.png">  
</p>
<p align="center">
    <i>Script for embedding environment variable in CRA apps without having to rebuild the on the server.</i>
    <br>
    <br>
    <img src="https://github.com/garronej/embed-react-app-envs/workflows/ci/badge.svg?branch=main">
    <img src="https://img.shields.io/bundlephobia/minzip/embed-react-app-envs">
    <img src="https://img.shields.io/npm/dw/embed-react-app-envs">
    <img src="https://img.shields.io/npm/l/embed-react-app-envs">
</p>
<p align="center">
  <a href="https://github.com/garronej/embed-react-app-envs">Home</a>
  -
  <a href="https://github.com/garronej/embed-react-app-envs">Documentation</a>
</p>

# Install / Import

```bash
$ npm install --save embed-react-app-envs
```

```typescript
import { myFunction, myObject } from "embed-react-app-envs";
```

Specific imports:

```typescript
import { myFunction } from "embed-react-app-envs/myFunction";
import { myObject } from "embed-react-app-envs/myObject";
```

## Import from HTML, with CDN

Import it via a bundle that creates a global ( wider browser support ):

```html
<script src="//unpkg.com/embed-react-app-envs/bundle.min.js"></script>
<script>
    const { myFunction, myObject } = embed_react_app_envs;
</script>
```

Or import it as an ES module:

```html
<script type="module">
    import { myFunction, myObject } from "//unpkg.com/embed-react-app-envs/zz_esm/index.js";
</script>
```

_You can specify the version you wish to import:_ [unpkg.com](https://unpkg.com)

## Contribute

```bash
npm install
npm run build
npm test
```
