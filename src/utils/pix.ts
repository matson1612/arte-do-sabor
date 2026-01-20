// src/utils/pix.ts

class PixPayload {
  private key: string;
  private name: string;
  private city: string;
  private amount: string;
  private txtId: string;

  constructor(key: string, name: string, city: string, amount: number, txtId: string = "***") {
    this.key = key;
    this.name = this.normalize(name).substring(0, 25);
    this.city = this.normalize(city).substring(0, 15);
    this.amount = amount.toFixed(2);
    this.txtId = txtId;
  }

  private normalize(str: string) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  private format(id: string, value: string): string {
    const len = value.length.toString().padStart(2, "0");
    return `${id}${len}${value}`;
  }

  private getCRC16(payload: string): string {
    let crc = 0xFFFF;
    for (let i = 0; i < payload.length; i++) {
      crc ^= payload.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if ((crc & 0x8000) !== 0) crc = (crc << 1) ^ 0x1021;
        else crc = crc << 1;
      }
    }
    return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, "0");
  }

  public generate(): string {
    const payload = [
      this.format("00", "01"), // Payload Format Indicator
      this.format("26", [      // Merchant Account Information
        this.format("00", "BR.GOV.BCB.PIX"),
        this.format("01", this.key)
      ].join("")),
      this.format("52", "0000"), // Merchant Category Code
      this.format("53", "986"),  // Transaction Currency (BRL)
      this.format("54", this.amount), // Transaction Amount
      this.format("58", "BR"),   // Country Code
      this.format("59", this.name), // Merchant Name
      this.format("60", this.city), // Merchant City
      this.format("62", this.format("05", this.txtId)), // Additional Data Field
      "6304" // CRC16 ID + Length placeholder
    ].join("");

    return `${payload}${this.getCRC16(payload)}`;
  }
}

// Valores Padrão (Fallback)
export const DEFAULT_PIX_KEY = "+5563981221181"; 
export const DEFAULT_NAME = "Arte do Sabor";
export const DEFAULT_CITY = "Palmas";

/**
 * Gera o código Copia e Cola (Payload Pix)
 * @param amount Valor da transação
 * @param config (Opcional) Configurações da Loja vindas do Banco.
 */
export const generatePixCopyPaste = (
  amount: number, 
  config?: { key: string; name: string; city: string }
) => {
  const key = config?.key || DEFAULT_PIX_KEY;
  const name = config?.name || DEFAULT_NAME;
  const city = config?.city || DEFAULT_CITY;

  const pix = new PixPayload(key, name, city, amount);
  return pix.generate();
};