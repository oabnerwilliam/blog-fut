import { FileArticleRepository } from "@/lib/content/file-repository";
import {
  FIXTURE_DO_CONTRATO,
  descreverContratoDoRepositorio,
} from "../../contract/article-repository.contract";

descreverContratoDoRepositorio(
  "FileArticleRepository",
  ({ mostrarExemplos }) =>
    new FileArticleRepository({
      contentDir: FIXTURE_DO_CONTRATO,
      mostrarExemplos,
      avisar: () => {},
    }),
);
