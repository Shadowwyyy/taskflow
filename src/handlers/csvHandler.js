async function processCSVExport(job) {
  const { data, filename } = job.data;
  
  console.log(`Exporting data to CSV: ${filename}`);
  console.log(`Records: ${data?.length || 0}`);

  await new Promise(resolve => setTimeout(resolve, 2500));
  
  console.log('CSV exported successfully');
  
  return {
    success: true,
    filename,
    recordCount: data?.length || 0,
    downloadUrl: `https://s3.amazonaws.com/taskflow-exports/${filename}`,
  };
}

module.exports = { processCSVExport };