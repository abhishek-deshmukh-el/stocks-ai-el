/**
 * User Model
 */

import mongoose, { Document, Model, Schema } from "mongoose";
import { Region } from "@/lib/constants";

export interface WatchlistItem {
  symbol: string;
  name: string;
  alertPrice?: number;
  atrPeriod: number;
  atrMultiplier: number;
  region: Region;
  owned?: boolean;
  _id?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUser extends Document {
  name: string;
  phoneNumber: string;
  fcmTokens: string[]; // Firebase Cloud Messaging tokens for push notifications
  createdAt: Date;
  updatedAt: Date;
  usStocks: WatchlistItem[];
  indiaStocks: WatchlistItem[];
}

const WatchlistItemSchema = new Schema(
  {
    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    alertPrice: {
      type: Number,
      min: 0,
    },
    atrPeriod: {
      type: Number,
      default: 14,
      min: 1,
    },
    atrMultiplier: {
      type: Number,
      default: 2.0,
      min: 0,
    },
    region: {
      type: String,
      enum: [Region.US, Region.INDIA],
      required: true,
    },
    owned: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const UserSchema: Schema<IUser> = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      trim: true,
      validate: {
        validator: function (v: string) {
          return /^\+?[\d\s\-()]{10,15}$/.test(v);
        },
        message: "Please enter a valid phone number",
      },
    },
    fcmTokens: {
      type: [String],
      default: [],
    },
    usStocks: {
      type: [WatchlistItemSchema],
      default: [],
    },
    indiaStocks: {
      type: [WatchlistItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Clear cached model if schema changed
if (mongoose.models.users) {
  // In development, we may need to clear the cached model for schema updates
  delete mongoose.models.users;
}

const User: Model<IUser> = mongoose.models.users || mongoose.model<IUser>("users", UserSchema);
export default User;
