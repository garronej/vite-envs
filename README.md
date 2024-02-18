<p align="center">
    <img src="https://github.com/garronej/vite-envs/assets/6702424/0f290fd7-19ea-41e6-97fb-da3fcc79d848">  
</p>
<p align="center">
    <i>Bundle environment variables in Vite at <strike>build time</strike> <b> when you start serving your app</b>!</i>
    <br>
    <br>
    <a href="https://github.com/garronej/vite-envs/actions">
      <img src="https://github.com/garronej/vite-envs/workflows/ci/badge.svg?branch=main">
    </a>
    <a href="https://bundlephobia.com/package/vite-envs">
      <img src="https://img.shields.io/bundlephobia/minzip/vite-envs">
    </a>
    <a href="https://github.com/garronej/vite-envs/blob/aa97a3cc446a0afdb7769a1d351c5b45723d3481/tsconfig.json#L14">
        <img src="https://camo.githubusercontent.com/0f9fcc0ac1b8617ad4989364f60f78b2d6b32985ad6a508f215f14d8f897b8d3/68747470733a2f2f62616467656e2e6e65742f62616467652f547970655363726970742f7374726963742532302546302539462539322541412f626c7565">
    </a>
    <a href="https://github.com/garronej/vite-envs/blob/main/LICENSE">
      <img src="https://img.shields.io/npm/l/vite-envs">
    </a>
</p>

# Motivation

In a Vite environment, variables (`import.meta.env.VITE_FOO`) are embedded into your static website at build time when you execute `vite build`.  
What if you want to allow the individual deploying your web app to configure the environment variables?  
`vite-envs` facilitates this by enabling you to:

```bash
docker run --env FOO="xyz" my-org/my-vite-app
```

Then, access `FOO`:

-   In your code, as `import.meta.env.FOO`
-   In `index.html`, like `<title>%FOO%</title>` or `<title><%= env.FOO %></title>` (EJS)

This method eliminates the need to rebuild your web app each time you wish to change some configuration.  
More importantly, it allows you to distribute a customizable Docker image of your web app!

# Features

-   ✅ Does not impact startup time.
-   ✅ Requires no network connection at container startup.
-   ✅ Secure: Only injects the envs declared in the `.env` file
-   ✅ Brings type safety to your environment variables.
-   ✅ Enable to dynamically generate `<head />` tags by rendering your `index.html` as an EJS template at container startup. Great for SEO.
-   ✅ Easy to set up, without breaking your Storybook or other tools in place.

# Drawbacks

Using `vite-envs` requires adding [a few extra lines to your Dockerfile](https://github.com/garronej/vite-envs-demo-app/blob/400360c36acbb1fb703ab0ed185a6272482805e9/Dockerfile#L16-L17) and [including Node.js in your Nginx-based Docker image](https://github.com/garronej/vite-envs-demo-app/blob/400360c36acbb1fb703ab0ed185a6272482805e9/Dockerfile#L12), which adds an additional 58MB to your Docker image.

If you have Vite plugins that transform your HTML index, they might not be compatible with `vite-envs`.  
If this is the case, please feel free to open an issue about it.

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

# Documentation

The usage documentation is the README of the the starter project:

👉[**garronej/vite-envs-demo-app**](https://github.com/garronej/vite-envs-demo-app)👈
