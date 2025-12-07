import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { data, filename, type } = await req.json()

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Aucune donnée" }, { status: 400 })
    }

    // Simulation export PDF - dans un vrai projet, utilisez jsPDF ou pdfkit
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${filename}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #4CAF50; color: white; }
            tr:nth-child(even) { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1>${filename}</h1>
          <table>
            <thead>
              <tr>${Object.keys(data[0]).map(key => `<th>${key}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${data.map((row: any) => `
                <tr>${Object.values(row).map(val => `<td>${val ?? ""}</td>`).join("")}</tr>
              `).join("")}
            </tbody>
          </table>
          <p style="margin-top: 20px; color: #666;">
            Généré le ${new Date().toLocaleDateString("fr-FR")}
          </p>
        </body>
      </html>
    `

    return new NextResponse(htmlContent, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `attachment; filename="${filename}.html"`
      }
    })
  } catch (error) {
    console.error("Erreur export PDF:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
