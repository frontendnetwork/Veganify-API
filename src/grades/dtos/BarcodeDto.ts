import { ApiProperty } from "@nestjs/swagger";

export class BarcodeDto {
  @ApiProperty({
    description: "The barcode to be checked",
    example: "4066600204404",
  })
  barcode: string = "4066600204404";
}
