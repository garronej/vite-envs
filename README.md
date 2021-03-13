<p align="center">
    <img src="https://user-images.githubusercontent.com/6702424/111043291-087c3d80-8442-11eb-8079-176d87c733a3.png">  
</p>
<p align="center">
    <i>Safely bundle server's environnement variable into react apps</i>
    <br>
    <br>
    <img src="https://github.com/garronej/embed-react-app-envs/workflows/ci/badge.svg?branch=main">
    <img src="https://img.shields.io/bundlephobia/minzip/embed-react-app-envs">
    <img src="https://img.shields.io/npm/dw/embed-react-app-envs">
    <img src="https://img.shields.io/npm/l/embed-react-app-envs">
</p>

# Motivation

Create react app provides no official way to inject environnement variable from the server into the page. 
When you run `yarn build` create react app do bundle all the variables prefixed by `REACT_APP_`
and expose them under `process.env` ([see here](https://create-react-app.dev/docs/adding-custom-environment-variables/)).  
The problem, however is that you likely don't want to build your app on the server.  
The CRA team also suggest to [introduce placeholders](https://create-react-app.dev/docs/title-and-meta-tags/#injecting-data-from-the-server-into-the-page) in the `public/index.html` 
and do the substitution on the server before serving the app. This solution involves a lot of hard to maintain scripting.

This module abstract away the burden of managing environnement variable injection as well as providing a type safe way
to retrieve them in your code (using TypeScript).

