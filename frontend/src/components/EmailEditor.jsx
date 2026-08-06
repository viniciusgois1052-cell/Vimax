import { useEffect, useRef } from "react";
import grapesjs from "grapesjs";
import pluginNewsletter from "grapesjs-preset-newsletter";

import "grapesjs/dist/css/grapes.min.css";


export default function EmailEditor({ value, onChange }) {

  const editor = useRef(null);


  useEffect(() => {

    if (editor.current) return;


    const editorInstance = grapesjs.init({

      container: "#gjs",

      height: "100%",

      width: "auto",

      storageManager: false,


      plugins: [
        pluginNewsletter
      ],


      pluginsOpts: {
        [pluginNewsletter]: {}
      },


      assetManager: {

        upload: "/api/marketing/upload-image",

        uploadName: "file",

        autoAdd: true,

      },


      canvas: {
        styles: []
      },


      blockManager: {
        appendTo: "#blocks"
      }

    });


    editor.current = editorInstance;


    // Carrega HTML salvo
    if (value) {
      editorInstance.setComponents(value);
    }


    // Atualiza o HTML no React
    editorInstance.on("update", () => {

      const html =
        editorInstance.getHtml() +
        `
        <style>
        ${editorInstance.getCss()}
        </style>
        `;


      onChange(html);

    });


    return () => {
      editorInstance.destroy();
      editor.current = null;
    };


  }, []);



  return (

    <div
      style={{
        display: "flex",
        height: "100%",
        width: "100%"
      }}
    >

      <div
        id="blocks"
        style={{
          width: "220px",
          borderRight: "1px solid #ddd",
          overflow: "auto"
        }}
      />


      <div
        id="gjs"
        style={{
          flex: 1,
          height: "100%"
        }}
      />

    </div>

  );

}