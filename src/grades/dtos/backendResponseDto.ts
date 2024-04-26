import { ApiProperty } from "@nestjs/swagger";

export class backendResponseDto {
  @ApiProperty({ description: "The barcode requested", example: "12345678" })
  barcode: string = "4066600204404";

  @ApiProperty({
    description: "The name of the product",
    example: "Paulaner Spezi Zero",
  })
  name: string = "Paulaner Spezi Zero";

  @ApiProperty({ description: "The grade of the product", example: "B" })
  grade: string = "B";
}
