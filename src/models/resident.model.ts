import mongoose, { Schema, Document } from 'mongoose';

export interface IResident extends Document {
  fullName: string;
  dob: Date;
  gender: string;
  identityCard: string;
  hometown: string;
  job: string;
  apartmentId?: string;
  roleInApartment?: 'Chủ hộ' | 'Thành viên';
  phone?: string;
  residencyStatus?: 'Thường trú' | 'Tạm trú' | 'Tạm vắng';
}

const ResidentSchema: Schema = new Schema(
  {
    fullName: { type: String, required: true },
    dob: { type: Date, required: true },
    gender: { type: String, required: true },
    identityCard: { type: String, required: true, unique: true },
    hometown: { type: String, required: true },
    job: { type: String, required: true },
    apartmentId: { type: Schema.Types.ObjectId, ref: 'Apartment' },
    roleInApartment: { type: String, enum: ['Chủ hộ', 'Thành viên'], default: 'Thành viên' },
    phone: { type: String },
    residencyStatus: { 
      type: String, 
      enum: ['Thường trú', 'Tạm trú', 'Tạm vắng'], 
      default: 'Thường trú',
      required: true
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IResident>('Resident', ResidentSchema);
