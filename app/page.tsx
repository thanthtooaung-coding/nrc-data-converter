"use client"

import { useState } from "react"
import { Button } from "./components/ui/button"
import { Textarea } from "./components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs"
import { Clipboard, Download } from "lucide-react"

export default function NRCDataConverter() {
  const [inputData, setInputData] = useState("")
  const [outputData, setOutputData] = useState("")
  const [copied, setCopied] = useState(false)

  const convertToSQL = () => {
    if (!inputData.trim()) {
      setOutputData("Please enter some data to convert")
      return
    }

    try {
      const lines = inputData.split("\n").filter((line) => line.trim())

      const dataLines = lines.slice(1)

      const regionGroups: Record<string, { 
        regionName: string; 
        regionNameMM: string; 
        code: string; 
        townships: { township: string; townshipMM: string }[] 
      }> = {};      

      dataLines.forEach((line) => {        
        const parts = line.split(/\t+|\s{2,}/)

        if (parts.length >= 6) {
          const regionName = parts[0].trim()
          const regionNameMM = parts[1].trim()
          const code = parts[2].trim()
          const township = parts[3].trim()
          const townshipMM = parts[5].trim()

          if (!regionGroups[regionName]) {
            regionGroups[regionName] = {
              regionName,
              regionNameMM,
              code,
              townships: [],
            }
          }

          regionGroups[regionName].townships.push({
            township,
            townshipMM,
          })
        }
      })

      let sql = ""

      Object.values(regionGroups).forEach((region) => {
        const regionNameFormatted = region.regionName.replace(/\s+$$[^)]+$$/g, "")

        sql += `-- ${region.regionName} State\n`
        sql += `INSERT INTO \`fineract_default\`.\`m_code_value\` (code_id, code_value, code_description, code_value_mm)\n`
        sql += `SELECT (SELECT id FROM m_code WHERE code_name = 'NRC_${regionNameFormatted.toUpperCase()}_TOWNSHIP'), township, CONCAT('Township of ${regionNameFormatted}'), township_myanmar\n`
        sql += `FROM (SELECT '${region.townships[0].township}' AS township, '${region.townships[0].townshipMM}' AS township_myanmar\n`

        for (let i = 1; i < region.townships.length; i++) {
          sql += `UNION SELECT '${region.townships[i].township}', '${region.townships[i].townshipMM}'\n`
        }

        sql += `) AS townships;\n\n`
      })

      setOutputData(sql)
    } catch (error: unknown) {
      if (error instanceof Error) {
        setOutputData(`Error converting data: ${error.message}`)
      } else {
        setOutputData("An unknown error occurred")
      }
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(outputData)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadSQL = () => {
    const blob = new Blob([outputData], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "nrc_townships.sql"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="container mx-auto py-10 max-w-5xl">
      <Card>
        <CardHeader>
          <CardTitle>NRC Data Converter</CardTitle>
          <CardDescription>Convert Excel-like NRC data to MySQL INSERT statements</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="convert" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="convert">Convert</TabsTrigger>
              <TabsTrigger value="help">Help</TabsTrigger>
            </TabsList>

            <TabsContent value="convert" className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label htmlFor="input-data" className="block text-sm font-medium mb-2">
                    Input Data (Excel-like format)
                  </label>
                  <Textarea
                    id="input-data"
                    placeholder="Paste your Excel data here..."
                    className="min-h-[200px]"
                    value={inputData}
                    onChange={(e) => setInputData(e.target.value)}
                  />
                </div>

                <Button onClick={convertToSQL} className="w-full">
                  Convert to SQL
                </Button>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label htmlFor="output-data" className="block text-sm font-medium">
                      Output SQL
                    </label>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={copyToClipboard} className="flex items-center gap-1">
                        <Clipboard className="h-4 w-4" />
                        {copied ? "Copied!" : "Copy"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={downloadSQL} className="flex items-center gap-1">
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  </div>
                  <Textarea id="output-data" className="min-h-[300px] font-mono text-sm" value={outputData} readOnly />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="help">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">How to use this converter</h3>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>Copy your Excel data including the header row</li>
                  <li>Paste it into the input field</li>
                  <li>Click &quot;Convert to SQL&quot;</li>
                  <li>The output will be formatted as MySQL INSERT statements</li>
                  <li>You can copy the output or download it as a SQL file</li>
                </ol>

                <h3 className="text-lg font-medium mt-6">Expected Input Format</h3>
                <p>The input should have the following columns:</p>
                <pre className="bg-muted p-2 rounded text-sm overflow-x-auto">
                  RegionName Eng RegionName MM Code NRC Pattern Eng Code NRC Pattern MM
                </pre>

                <h3 className="text-lg font-medium mt-6">Output Format</h3>
                <p>The output will be MySQL INSERT statements grouped by region.</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

