<p align="center">
    <img src="https://github.com/garronej/vite-envs/assets/6702424/0f290fd7-19ea-41e6-97fb-da3fcc79d848">  
</p>
<p align="center">
    <i>Bundle environment variables in Vite at <strike>build time</strike> <b> launch time</b>!</i>
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

Vite [supports environment variable](https://vitejs.dev/guide/env-and-mode) but they are bundled at build time when `yarn build` is run.  
If we want to change anything like the URL of the backend the app should connect to, we have to rebuild, we can't ship customizable Docker image of our Vite apps.  
In practice vite-envs enable to turn a statically build React project into a configurable webapp.  

The solution would be to be able to do:  
```bash
 docker run --env FOO="xyz" my-org/my-vite-app
 ```
Then access `FOO`:  
- In the code like `import.meta.env.FOO` 
- In `index.html` like `<title>%FOO%</title>` or `<title><%= process.env.FOO %></title>`

`vite-envs` does just that, in a secure, performant and type safe way.  

# Features

- ✅ No impact on the startup time.
- ✅ Require no network connection at container startups.
- ✅ Secure: It only injects the envs declared in the `.env` file.  
- ✅ It works like you are already used to. It just changes **when** the envs are injected.  
- ✅  EJS support in `public/index.html` 
This enables to server render your index.html at container startup [example usage: Enable your font to be customized](https://github.com/InseeFrLab/onyxia/blob/beafadd3bd5183ce2b5a0928ee2ef1dc6212d121/web/public/index.html#L41-L88).  
- ✅ (Optional) Type safe: An env getter is generated so [you know what envs are available](https://user-images.githubusercontent.com/6702424/154802407-92d2d0b7-b74c-4b35-a2b5-5c27c26d5127.png).  

# Drawbacks

Using `vite-envs` will complicate your [Dockerfile](https://github.com/etalab/vite-envs-demo-app/blob/main/Dockerfile) and necessitate the inclusion of Node.js alongside 
Nginx in your Docker image. This adds an additional 58MB for Node.js, which is necessary for server-rendering `public/index.html` at the container's startup.

If server-rendering `index.html` (as a EJS template) is not on your agenda (though it may become a requirement in the future), you may want 
to consider [import-meta-envs](https://import-meta-env.org/) for a solution with a smaller impact on your Docker image's size.


# Usecase example

<p align="center">
	<img src="https://user-images.githubusercontent.com/6702424/154810177-3da80638-93c3-4a41-9710-13541b9d8974.png" />
</p>

[Onyxia-web](https://github.com/InseeFrLab/onyxia-web) is a Vite app distributed as a [Docker image](https://hub.docker.com/r/inseefrlab/onyxia-web/tags).  

Sysadmins that would like to deploy Onyxia on their infrastructure can simply use
[the official Docker image](https://hub.docker.com/r/inseefrlab/onyxia-web/tags) and provide relevant environnement variable to adjust the theme/branding of the website to their usecase.  

Here are two deployment example:  

<p align="center">
  <a href="https://datalab.sspcloud.fr">
    <img src="https://user-images.githubusercontent.com/6702424/154809580-b38abbc2-d7be-4fc2-ad7d-b830d88f3a57.png">  
  </a>
  <a href="https://sill-demo.etalab.gouv.fr/">
    <img src="https://user-images.githubusercontent.com/6702424/154809578-4aaa5501-e356-484b-8a95-c2a59e287cf9.png">  
  </a>
</p>
<p align="center">
        <sub><sup><em>Click on the social media preview to access the websites</em></sup></sub>
</p>


# Documentation

Find 👉[**here**](https://github.com/garronej/vite-envs-demo-app)👈 a demo setup of:  
`vite-envs` + `vite` + `TypeScript` + `Nginx` + `Docker`


# More details on how it works

The recommended way to get started with `cra-envts` is to follow the instructions
provided in [the vite-envs-demo-app](https://github.com/garronej/vite-envs-demo-app).  
Now, if you want to acquire a deeper understanding what the tool does and how
you can follow the following steps.

Start by installing the tool: 

```bash
yarn add vite-envs 
```

Then declare all the allowed environment variables into the `.env` file of your project

Example
```ini
REACT_APP_FOO="Default value of foo"
REACT_APP_BAR=
REACT_APP_BAZ=
REACT_APP_FIZZ=
```

Once it's done run the script `npx vite-envs prepare`

It will generate `src/env.ts` looking like:
```typescript
/* 
* Automatically generated by vite-envs.
* If you wish to declare a new environment variable declare it in the .env file (prefixed by REACT_APP_)
* then run 'npx generate-env-getter' at the root of your project.
* This file will be updated.
*/
import { env as env_loosly_typed } from "vite-envs";

export const envNames = [
  "FOO",
  "BAR",
  "BAZ",
  "FIZZ"
] as const;

export type EnvNames = typeof envNames[number];

export const env = env_loosly_typed as Record<EnvNames, string>;
```
(This file should be gitignored)  

Now let's test it by creating a `.env.local` file like:  
```ini
VITE_BAR="Value of bar defined in .env.local"
```

And let's do this somewhere in our code: 

```typescript
import { getEnv } from "./env.ts"

console.log(getEnv());
```
Now if we run `VITE_BAZ="Value of baz passed inline" yarn start` we get this
in the console: 

```json
{
    "FOO": "Default value of foo",
    "BAR": "Value of bar defined in .env.local",
    "BAZ": "Value of baz passed inline",
    "FIZZ": ""
}
```

Now if you run `yarn build` then `BAZ="Value of baz on the server" npx embed-environnement-variables`
the value of `BAZ` will be injected in `build/index.html` (or `html/index.html`) so that if you 
start statically serving
the `dist/` dir, for example with `serve -s dist` you will get this in the console:  

```json
{
    "FOO": "Default value of foo",
    "BAR": "Value of baz on the server",
    "BAZ": "",
    "FIZZ": ""
}
```

Note that on the server the environment variable names don't need to be prefixed with `VITE_` (they can though).
Also note that the script runs very fast and thus represent virtually no overhead when starting your container.  

The next step is to set up a clean Dockerfile where there is both node and Ngnix available.  
Node for being able to run `npx embed-environnement-variables` and Ngnix for serving the app.  
It is also important to make sure `vite-envs` is not bootstrapped by `npx` in the entrypoint.
