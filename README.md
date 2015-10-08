# NIML
Non-Indented Markup Language

NIML is a text oriented markup language, convertible to HTML or XML. 
NIML's purpose is to be used for documentation and templating, therefore its 
top objective is to be simple to read and write.

```
html+
head
+title NIML
+link { href: niml.css rel: stylesheet type: text/css  }
body+
div+ { class: container }
h1 NIML
p Paragraph
```

For more information see http://mstijak.github.io/niml/.

At the moment, NIML is in it's very early stage. Ideas and contributions are very welcome.

## Implementations

- node - https://github.com/mstijak/niml-node
- C# - https://github.com/mstijak/niml.net
