import { app } from "./app";

const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`Praxis API escuchando en el puerto ${port}`);
});
