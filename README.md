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
    <a href="https://bundlephobia.com/package/vite-envs">
      <img src="https://img.shields.io/bundlephobia/minzip/vite-envs">
    </a>
    <a href="https://github.com/garronej/vite-envs/blob/main/LICENSE">
      <img src="https://img.shields.io/npm/l/vite-envs">
    </a>
</p>

# Motivation

In Vite environment variables (`import.meta.env.VITE_FOO`) are embedded into the static website at build time,
when `vite build` is ran.  
What if we need to allow the person deploying the webapp to configure the environment variables?  
What if we want to build once and deploy in multiple configuration?  
`vite-envs` facilitates this by enabling you to:

```bash
docker run --env FOO="xyz" my-org/my-vite-app
```

Then, access `FOO`:

-   In your code TypeScript code as `import.meta.env.FOO`
-   In `index.html`, as `<title>%FOO%</title>` or `<title><%= import.meta.env.FOO %></title>` (EJS)

This eliminates the need to rebuild each time you wish to change some configuration.  
More importantly, it allows you to distribute a customizable Docker image of your webapp!

# Features

-   ✅ Easy to setup, does not require you to rethink your build system, does not break your Storybook.
-   ✅ Secure: Only injects the envs declared in the `.env` file
-   ✅ Brings type safety to your environment variables (`import.meta.env` gets types definition).
-   ✅ `import.meta.env` is an object, not a placeholder. You can do `Object.keys(import.meta.env)` for example.
-   ✅ SEO: Enable to dynamically generate `<head />` tags by rendering your `index.html` as an EJS template.

# Drawbacks

Using `vite-envs` requires adding [a few extra lines to your Dockerfile](https://github.com/garronej/vite-envs-demo-app/blob/400360c36acbb1fb703ab0ed185a6272482805e9/Dockerfile#L16-L17) and [including Node.js in your Nginx-based Docker image](https://github.com/garronej/vite-envs-demo-app/blob/400360c36acbb1fb703ab0ed185a6272482805e9/Dockerfile#L12), which adds an additional 58MB to your Docker image.  
The trade-off of including Node.js is justified by the necessity to re-render the index.html at container startup. It is very important for SEO that certain tags be present in the <head /> section from the outset for social media previews or analytics tools.
We aim to execute some logic in the head section based on the dynamic configuration of the web application. EJS is perfect for this task, allowing us to write logic like the following:

```bash
docker run \
  --env TITLE='My org dasboard' \
  --env CUSTOM_META_TAGS='{ description: "Org dasboard for X and Y" }' \
  my-org/my-vite-app
```

`index.html`

```html
<!DOCTYPE html>
<html lang="en">
    <head>
        <!-- ... -->

        <title>%TITLE%</title>

        <!-- JSON5 is made available by vite-envs, it's a more permissive JSON 
         format that is well fitted for configuration wrote by humans -->
        <% const obj = JSON5.parse(import.meta.env.CUSTOM_META_TAGS); %> <% for (const [key, value] of
        Object.entries(obj)) { %>
        <meta name="<%= key %>" content="<%= value %>" />
        <% } %>
    </head>
</html>
```

The fact that vite-envs processes your HTML index as an EJS template also means it might not integrate smoothly with other plugins that modify the index.html.
If this occurs, please do not hesitate to open an issue regarding it.

# Alternative

There is another notable library that addresses the same problem: [import.meta.env](https://import-meta-env.org/).

## Arguments in favor of `vite-envs`

-   **Simpler to Set Up and Transparent:** The scope of [import.meta.env](https://import-meta-env.org/) is much broader,
    aiming to solve the problem of injecting environment variables into Single Page Applications (SPAs) in general.
    On the other hand, `vite-envs` focuses on a much narrower use case. It's specifically a Vite plugin designed for seamless
    integration with your Vite application. The setup process is straightforward and does not impact your CI or build system.

-   **Use Environment Variables in Your `index.html`:** `vite-envs` also supports performing substitutions and running
    Embedded JavaScript (EJS) in your `index.html` file, which is a must have SEO and preloading fonts for example.

## Arguments in favor of `import.meta.env`

-   **Minimal Impact on the Docker Image Size:** Unlike `vite-envs`, [which requires Node.js to be available on the host serving your static files](https://github.com/garronej/vite-envs-demo-app/blob/a4933fc6c190bf3c7033162cee5bcc2c2411ce09/Dockerfile#L12),
    `import.meta.env` does not affect the bundle size of your Docker image.
    It generates a shell script at build time, which you can execute before serving the application, offering a lightweight solution without additional runtime dependencies.

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

👉[**vite-envs-starter**](https://github.com/garronej/vite-envs-starter)👈
