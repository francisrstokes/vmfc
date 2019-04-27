module.exports = ast => {
  // Remove the comments from section data
  ast.sections.forEach(dataSection => {
    dataSection.section = dataSection.section.filter(item => {
      return item.type !== 'comment';
    });
  });

  // Here is where AST optimistions could also be made - rewriting
  // instructions in a more efficient form

  return ast;
}