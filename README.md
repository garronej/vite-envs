<p align="center">
    <img src="https://github.com/garronej/vite-envs/assets/6702424/0f290fd7-19ea-41e6-97fb-da3fcc79d848">  
</p>
<p align="center">
    <i>Bundle environment variables in Vite at <strike>build time</strike> <b> startup time</b>!</i>
    <br>
    <br>
    <a href="https://github.com/garronej/vite-envs/actions">
      <img src="https://github.com/garronej/vite-envs/workflows/ci/badge.svg?branch=main">
    </a>
    <a href="https://github.com/garronej/vite-envs/blob/main/LICENSE">
      <img src="https://img.shields.io/npm/l/vite-envs">
    </a>
    <p align="center">
      <a href="https://github.com/garronej/vite-envs-starter">Documentation / Starter</a>
    </p>
</p>

# Motivation

In Vite, `import.meta.env` variables are set at build time with `vite build`.  
However we often want to enable the person deploying the app to define those values, we don't want to re build every time we need
to change a configuration.  
`vite-envs` facilitates this by enabling to:

```bash
docker run --env FOO="xyz" my-org/my-vite-app
```

Then, access `FOO`:

-   In the TypeScript code as `import.meta.env.FOO`
-   In `index.html`, as `<title>%FOO%</title>`

This eliminates the need to rebuild each time you wish to change some configuration.  
More importantly, it allows you to ship a customizable Docker image of your webapp!

# Features

-   🔧 Effortless setup: Integrates smoothly, works as your already used to, does not disrupt your Storybook.
-   🔒 Secure: Only injects environment variables explicitly defined in the `.env` file.
-   😌 The `VITE_` prefix isn't required.  
-   🛡️ Type-safe: Type definition for your `import.meta.env`. Hot reload enabled!
-   🌐 `index.html`: Use your envs in your HTML file.  
-   📦 `import.meta.env` is an object, not a placeholder. `Object.keys(import.meta.env)` works.
-   🧠 Supports computation of env default values at build time.  

# Types  

One notable benefit of using `cra-envs` is you're getting strict types definitions for `import.meta.env` 
and it's hot reloading enabled.  

[types-hot-reloading.webm](https://github.com/garronej/vite-envs/assets/6702424/78113d59-ac59-46b6-ada2-c325f475256c)

# Documentation

👉[**vite-envs-starter**](https://github.com/garronej/vite-envs-starter)👈

# Usecase example

<p align="center">
	<img src="https://user-images.githubusercontent.com/6702424/154810177-3da80638-93c3-4a41-9710-13541b9d8974.png" />
</p>

[Onyxia](https://github.com/InseeFrLab/onyxia) is a Vite app distributed as a [Docker image](https://hub.docker.com/r/inseefrlab/onyxia-web/tags).

Sysadmins that would like to deploy Onyxia on their infrastructure can simply use
[the official Docker image](https://hub.docker.com/r/inseefrlab/onyxia-web/tags) and provide relevant environnement variable to adjust the theme/branding of the website to their usecase as
documented [here](https://docs.onyxia.sh/admin-doc/theme).

Here are two deployment example:

<p align="center">
  <a href="https://datalab.sspcloud.fr">
    <img src="https://user-images.githubusercontent.com/6702424/154809580-b38abbc2-d7be-4fc2-ad7d-b830d88f3a57.png">  
  </a>
  <a href="https://onyxialpha.kub.sspcloud.fr/">
    <img src="https://user-images.githubusercontent.com/6702424/154809578-4aaa5501-e356-484b-8a95-c2a59e287cf9.png">  
  </a>
</p>
</p>
